@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

@layer base {
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    @apply bg-[#0a0a0f] text-zinc-100;
    overflow: hidden;
  }

  ::-webkit-scrollbar {
    width: 3px;
    height: 3px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-zinc-700/50 rounded-full;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-zinc-600;
  }
}

@layer components {
  /* Message entrance animation */
  .msg-enter {
    animation: msgEnter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
  }

  @keyframes msgEnter {
    from {
      opacity: 0;
      transform: translateY(10px) scale(0.96);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Typing dots */
  .typing-dot {
    @apply w-1.5 h-1.5 rounded-full bg-zinc-400;
    animation: typingPulse 1.5s ease-in-out infinite;
  }

  .typing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typingPulse {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-4px);
      opacity: 1;
    }
  }

  /* Online pulse ring */
  @keyframes onlineRing {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }

  .online-ring {
    animation: onlineRing 2.5s ease-in-out infinite;
  }

  /* Glass effect */
  .glass {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.06);
  }

  .glass-dark {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }

  /* Gradient text */
  .gradient-text {
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* Message bubble hover reactions */
  .reaction-bar {
    @apply opacity-0 scale-90 pointer-events-none;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .msg-bubble:hover .reaction-bar {
    @apply opacity-100 scale-100 pointer-events-auto;
  }

  /* Sidebar item hover */
  .conv-item {
    transition: all 0.15s ease;
  }

  .conv-item:hover {
    transform: translateX(2px);
  }

  /* Input focus glow */
  .input-glow:focus-within {
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.3), 0 0 20px rgba(96, 165, 250, 0.1);
  }

  /* Shimmer loading */
  .shimmer {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.03) 25%,
      rgba(255,255,255,0.07) 50%,
      rgba(255,255,255,0.03) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
}
