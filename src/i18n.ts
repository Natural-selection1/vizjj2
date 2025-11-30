import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en_US from "./locales/en-US.json";
import zh_CN from "./locales/zh-CN.json";

const resources = {
    "en-US": {
        translation: en_US,
    },
    "zh-CN": {
        translation: zh_CN,
    },
};

i18n.use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: "en-US",
        debug: true,

        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
