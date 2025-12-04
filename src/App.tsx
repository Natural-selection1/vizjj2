import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import TitleBar from "./components/title_bar";
import "./App.css";

function App() {
    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-sidebar">
            {/* 1. Titlebar */}
            <div className="h-9 w-full shrink-0 border-b border-border">
                <TitleBar />
            </div>

            {/* 2. Operation Bar */}
            <div className="h-18 w-full shrink-0 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex items-center justify-center">
                <span className="font-bold">Operation Bar</span>
            </div>

            {/* 3. Middle Area */}
            <div className="flex-1 w-full min-h-0">
                <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                    {/* Left Info Panel */}
                    <ResizablePanel
                        defaultSize={15}
                        minSize={5}
                        className="bg-sidebar text-sidebar-foreground flex items-center justify-center">
                        <span className="font-bold">Left Info</span>
                    </ResizablePanel>

                    {/* Resize Handle */}
                    <ResizableHandle className="bg-border hover:bg-sidebar transition-colors" />

                    {/* Main Content Panel */}
                    <ResizablePanel
                        defaultSize={60}
                        minSize={20}
                        className="bg-background text-foreground flex flex-col"></ResizablePanel>

                    <ResizableHandle className="bg-border hover:bg-sidebar transition-colors" />

                    {/* Right Info Panel */}
                    <ResizablePanel
                        defaultSize={25}
                        minSize={5}
                        className="bg-sidebar text-sidebar-foreground flex items-center justify-center">
                        <span className="font-bold">Right Info</span>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>

            {/* 4. Bottom Bar */}
            <div className="h-9 w-full shrink-0 bg-sidebar text-sidebar-foreground flex items-center justify-center">
                <span className="font-bold">Bottom Bar</span>
            </div>
        </div>
    );
}

export default App;
