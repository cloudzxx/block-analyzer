import { useState, useCallback } from "react";
export function useChat() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const sendMessage = useCallback(async (userMsg) => {
        if (!userMsg.trim())
            return;
        setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
        setIsLoading(true);
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: userMsg }),
            });
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let assistantContent = "";
            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                while (true) {
                    const eventEnd = buffer.indexOf("\n\n");
                    if (eventEnd === -1)
                        break;
                    const eventBlock = buffer.slice(0, eventEnd);
                    buffer = buffer.slice(eventEnd + 2);
                    const eventMatch = eventBlock.match(/^event:\s*(\w+)/m);
                    const eventType = eventMatch ? eventMatch[1] : "";
                    const dataMatch = eventBlock.match(/^data:\s*(.+)$/m);
                    const dataStr = dataMatch ? dataMatch[1] : "{}";
                    let data = {};
                    try {
                        data = JSON.parse(dataStr);
                    }
                    catch { }
                    switch (eventType) {
                        case "text_delta": {
                            const text = data.content || "";
                            assistantContent += text;
                            setMessages((prev) => {
                                const copy = [...prev];
                                copy[copy.length - 1] = { ...copy[copy.length - 1], content: assistantContent };
                                return copy;
                            });
                            break;
                        }
                        case "tool_start":
                        case "tool_result": {
                            setMessages((prev) => {
                                const copy = [...prev];
                                copy[copy.length - 1] = {
                                    ...copy[copy.length - 1],
                                    toolInfo: {
                                        name: data.name || "",
                                        args: eventType === "tool_start" ? data.content || "" : "",
                                        result: eventType === "tool_result" ? data.result || "" : "",
                                    },
                                };
                                return copy;
                            });
                            break;
                        }
                        case "done": break;
                        case "error":
                            console.error("Chat error:", data.message);
                            break;
                    }
                }
            }
        }
        catch (err) {
            console.error("Chat error:", err);
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    return { messages, sendMessage, isLoading };
}
