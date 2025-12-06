use std::collections::HashMap;
use std::sync::Arc;

use anyhow::{Context, Result, anyhow};
use jj_cli::config::{self, ConfigEnv};
use jj_cli::revset_util;
use jj_cli::ui::Ui;
use jj_cli::{cli_util, time_util};
use jj_lib::id_prefix::IdPrefixContext;
use jj_lib::object_id::ObjectId;
use jj_lib::repo::Repo;
use jj_lib::repo::StoreFactories;
use jj_lib::repo_path::RepoPathUiConverter;
use jj_lib::revset::{
    RevsetDiagnostics, RevsetExtensions, RevsetParseContext, RevsetWorkspaceContext,
    SymbolResolverExtension,
};
use jj_lib::settings::UserSettings;
use jj_lib::workspace::{self, DefaultWorkspaceLoaderFactory, WorkspaceLoaderFactory};
#[allow(unused_imports)]
use log::{debug, info};

use crate::bindings::Commit;

static UPPER_LIMIT: usize = 3000;

#[tauri::command]
pub fn get_commits(cwd: String) -> Result<Vec<Commit>, String> {
    get_commits_impl(&cwd).map_err(|e| format!("{:#}", e))
}

fn get_commits_impl(cwd: &str) -> Result<Vec<Commit>> {
    let target_path = std::fs::canonicalize(cwd).context("canonicalize path")?;
    let workspace_root = cli_util::find_workspace_dir(&target_path);

    // 初始化配置
    let config_env = ConfigEnv::from_environment();
    let mut raw_config = config::config_from_environment(config::default_config_layers());
    config_env.reload_user_config(&mut raw_config)?;
    let config = config_env.resolve_config(&raw_config)?;
    let user_settings = UserSettings::from_config(config.clone())?;

    // 加载工作区
    let store_factories = StoreFactories::default();
    let working_copy_factories = workspace::default_working_copy_factories();
    let loader_factory = DefaultWorkspaceLoaderFactory;
    let loader = loader_factory.create(workspace_root)?;

    let workspace = loader.load(&user_settings, &store_factories, &working_copy_factories)?;

    // 加载仓库
    let repo_loader = workspace.repo_loader();
    let repo = repo_loader.load_at_head()?;

    // 设置 Revset 解析上下文
    let ui = Ui::with_config(&config).map_err(|e| anyhow!("{:?}", e))?;
    let aliases_map =
        revset_util::load_revset_aliases(&ui, &config).map_err(|e| anyhow!("{:?}", e))?;

    let workspace_context = RevsetWorkspaceContext {
        path_converter: &RepoPathUiConverter::Fs {
            cwd: std::path::PathBuf::from(cwd),
            base: workspace.workspace_root().to_owned(),
        },
        workspace_name: workspace.workspace_name(),
    };

    let extensions = Arc::new(RevsetExtensions::default());
    let now = chrono::Utc::now().fixed_offset();
    let parse_context = RevsetParseContext {
        aliases_map: &aliases_map,
        local_variables: HashMap::new(),
        user_email: user_settings.user_email(),
        date_pattern_context: now.into(),
        default_ignored_remote: None,
        use_glob_by_default: false,
        extensions: &extensions,
        workspace: Some(workspace_context),
    };

    // 解析工作区提交 ID 使用 revset "@"
    // 避免依赖不稳定/隐藏的 WorkingCopy traits
    let id_prefix_context = IdPrefixContext::default();

    let is_immutable = {
        let mut diagnostics = RevsetDiagnostics::new();
        let immutable_heads_expression =
            revset_util::parse_immutable_heads_expression(&mut diagnostics, &parse_context)
                .map_err(|e| anyhow!("Failed to parse immutable heads: {}", e))?;
        let immutable_expression = immutable_heads_expression.ancestors();
        let immutable_revset_evaluator = revset_util::RevsetExpressionEvaluator::new(
            repo.as_ref(),
            extensions.clone(),
            &id_prefix_context,
            immutable_expression,
        );
        let immutable_revset = immutable_revset_evaluator
            .evaluate()
            .map_err(|e| anyhow!("Failed to evaluate immutable revset: {}", e))?;
        immutable_revset.containing_fn()
    };

    let revset = {
        let revset_str = "::";
        let mut diagnostics = RevsetDiagnostics::new();
        let expression = jj_lib::revset::parse(&mut diagnostics, revset_str, &parse_context)?;
        let symbol_resolver = revset_util::default_symbol_resolver(
            repo.as_ref(),
            &[] as &[Box<dyn SymbolResolverExtension>],
            &id_prefix_context,
        );
        let resolved_expression =
            expression.resolve_user_expression(repo.as_ref(), &symbol_resolver)?;
        resolved_expression.evaluate(repo.as_ref())?
    };

    let mut vizjj_commits = Vec::new();
    for commit_id in revset.iter().take(UPPER_LIMIT) {
        let commit_id = commit_id?;
        let jj_commit = repo.store().get_commit(&commit_id)?;
        let vizjj_commit = Commit {
            change_id: jj_commit.change_id().to_string(),
            commit_id: commit_id.hex(),
            author_email: jj_commit.author().email.clone(),
            timestamp: time_util::format_absolute_timestamp(&jj_commit.author().timestamp)?,
            parents: jj_commit.parent_ids().iter().map(|id| id.hex()).collect(),
            is_immutable: is_immutable(&commit_id).unwrap_or(true),
            is_conflict: jj_commit.has_conflict(),
            bookmarks: repo
                .view()
                .local_bookmarks_for_commit(&commit_id)
                .map(|(name, _target)| name.as_str().to_string())
                .collect(),
            tags: repo
                .view()
                .tags()
                .map(|(name, target)| {
                    if target.local_target.added_ids().any(|id| id == &commit_id) {
                        name.as_str().to_string()
                    } else {
                        "".to_string()
                    }
                })
                .collect(),
            description: jj_commit.description().to_string(),
            is_working_copy: repo.view().is_wc_commit_id(&commit_id),
        };

        debug!("vizjj_commit: {:#?}", vizjj_commit);

        vizjj_commits.push(vizjj_commit);
    }

    Ok(vizjj_commits)
}
