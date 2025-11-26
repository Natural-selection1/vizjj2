import TitleBar from "./components/title_bar";
import "./App.css";

function App() {
    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-sidebar">
            {/* 1. Titlebar */}
            <div className="h-[33px] w-full shrink-0 border-b border-border">
                <TitleBar />
            </div>
        </div>
    );
}

export default App;
