import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { useChat } from "./hooks/useChat";
import styles from "./App.module.css";
function App() {
    const [input, setInput] = useState("");
    const { messages, sendMessage, isLoading } = useChat();
    const handleSend = () => {
        if (!input.trim() || isLoading)
            return;
        sendMessage(input);
        setInput("");
    };
    return (_jsxs("div", { className: styles.app, children: [_jsx("div", { className: styles.messages, children: messages.map((msg, i) => (_jsxs("div", { className: msg.role === "user" ? styles.userMsg : styles.assistantMsg, children: [_jsxs("strong", { children: [msg.role === "user" ? "You" : "Assistant", ":"] }), _jsx("p", { children: msg.content || (isLoading && i === messages.length - 1 ? "Thinking..." : "") }), msg.toolInfo && (_jsxs("details", { className: styles.toolInfo, children: [_jsx("summary", { children: msg.toolInfo.name }), _jsx("pre", { children: msg.toolInfo.result })] }))] }, i))) }), _jsxs("div", { className: styles.inputArea, children: [_jsx("input", { value: input, onChange: (e) => setInput(e.target.value), onKeyDown: (e) => e.key === "Enter" && handleSend(), placeholder: "Ask about blockchain data...", className: styles.input, disabled: isLoading }), _jsx("button", { onClick: handleSend, className: styles.button, disabled: isLoading, children: "Send" })] })] }));
}
export default App;
