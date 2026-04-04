import { useState } from "react";

const EMOJI_CATEGORIES = [
  {
    label: "常用",
    emojis: ["😀","😂","🤣","😊","😍","🥰","😘","😜","🤔","😅","😢","😭","😤","🥺","😱","🤗","👍","👎","👏","🙏","💪","❤️","🔥","🎉","✨","💯","🌹","🍀","☀️","🌙"]
  },
  {
    label: "表情",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🫡","🤐","🤨","😐","😑","😶","🫥","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐"]
  },
  {
    label: "手势",
    emojis: ["👋","🤚","🖐️","✋","🖖","🫱","🫲","🫳","🫴","👌","🤌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","🫵","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏"]
  },
  {
    label: "动物",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐻‍❄️","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐔","🐧","🐦","🦅","🦆","🦉","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜"]
  },
  {
    label: "食物",
    emojis: ["🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥝","🍅","🥑","🍔","🍕","🌮","🍜","🍣","🍦","🎂","🍰","🧁","☕","🍵","🧋","🍺"]
  },
  {
    label: "符号",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❤️‍🔥","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☯️","✡️","⭐","🌟","💫","✨","⚡","🔥","💥","🎵","🎶"]
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="max-w-lg mx-auto px-2 pb-2">
      {/* Category tabs */}
      <div className="flex gap-1 px-2 py-1.5 overflow-x-auto scrollbar-hide">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveTab(i)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              activeTab === i
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="h-[180px] overflow-y-auto px-1">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_CATEGORIES[activeTab].emojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="h-10 w-full flex items-center justify-center text-xl hover:bg-accent rounded-lg transition-colors active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
