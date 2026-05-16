import React from "react";
import { ChatState } from "../context/ChatProvider";
import { format } from "date-fns";
import { Circle, CheckCircle2, AlertCircle } from "lucide-react";

const ScrollableChat = ({ messages }) => {
  const { user } = ChatState();

  const isSameSender = (messages, m, i, userId) => {
    return (
      i < messages.length - 1 &&
      (messages[i + 1].sender._id !== m.sender._id ||
        messages[i + 1].sender._id === undefined) &&
      messages[i].sender._id !== userId
    );
  };

  const isLastMessage = (messages, i, userId) => {
    return (
      i === messages.length - 1 &&
      messages[messages.length - 1].sender._id !== userId &&
      messages[messages.length - 1].sender._id
    );
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'sending':
        return <Circle className="w-3 h-3 text-gray-400 animate-pulse" />;
      case 'sent':
        return <CheckCircle2 className="w-3 h-3 text-black" />; // Black for sent
      case 'delivered':
        return <CheckCircle2 className="w-3 h-3 text-gray-500" />; // Grey for delivered
      case 'read':
        return <CheckCircle2 className="w-3 h-3 text-blue-500" />; // Blue for read
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />; // Red for failed
      default:
        return <CheckCircle2 className="w-3 h-3 text-black" />;
    }
  };

  return (
    <div className="flex flex-col space-y-3 pb-4">
      {messages &&
        messages.map((m, i) => {
          const isMyMessage = m.sender._id === user._id;
          const showAvatar = isSameSender(messages, m, i, user._id) || isLastMessage(messages, i, user._id);

          return (
            <div key={m._id} className={`flex items-end ${isMyMessage ? "justify-end" : "justify-start"}`}>
              {showAvatar && !isMyMessage && (
                <img
                  src={m.sender.avatar || "./public/Portrait_Placeholder.png"}
                  alt={m.sender.name || m.sender.userid}
                  className="w-8 h-8 rounded-full mr-2 object-cover"
                  title={m.sender.name || m.sender.userid}
                />
              )}
              <div
                className={`relative px-4 py-2 max-w-[75%] shadow-sm flex flex-col ${
                  isMyMessage
                    ? "bg-blue-800 text-white rounded-2xl rounded-br-sm"
                    : "bg-white text-blue-900 border border-blue-100 rounded-2xl rounded-bl-sm"
                } ${!isMyMessage && !showAvatar ? "ml-10" : ""}`}
              >
                {!isMyMessage && (showAvatar || i === 0 || messages[i-1].sender._id !== m.sender._id) && (
                  <span className="text-xs font-bold text-blue-600 mb-1">{m.sender.name || m.sender.userid}</span>
                )}
                {m.type === 'text' ? (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                ) : (
                  <img src={m.content} alt="Shared Image" className="rounded-lg max-w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity mt-1" onClick={() => window.open(m.content, '_blank')} />
                )}
                <div className={`flex items-center justify-end gap-1 text-[10px] mt-1 ${isMyMessage ? "text-blue-200" : "text-blue-400"}`}>
                  <span>{format(new Date(m.createdAt || Date.now()), 'hh:mm a')}</span>
                  {isMyMessage && getStatusIcon(m.status)}
                </div>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default ScrollableChat;
