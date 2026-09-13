# MUZAMIL-XD: New Commands

## Commands

- `.getpp 923xxxxxxxxx` or reply to a person's message with `.getpp`: downloads and sends the accessible profile picture. The command is owner/sudo-only.
- `.indicator on/off`: enables or disables indicator handling.
- `.indicatorset null/white/blue`: `null` and `white` leave WhatsApp's normal delivered state; `blue` sends the supported read receipt through Baileys. WhatsApp controls the final receipt state, so an offline recipient cannot be forced to show a particular tick state.
- `.selfchat on/off`: enables AI replies. In groups, the bot replies only when mentioned or when a message replies to the bot. In inbox mode, it responds to incoming private messages.
- `.selfchatset group/inbox`: selects separate group-history or per-user inbox memory.
- `.antibadword on/off` and `.antibadword set delete|kick|warn`: configure AI-assisted group moderation.
- `.antibadwordingset delete|kick|warn`: alias requested for setting the moderation action.

## AI API configuration

The verified Gemini endpoint and API key are already bundled in `lib/ai_config.js`, so no extra environment setup is required after extracting this ZIP.

Each eligible group message starts its own AI moderation request. There is no single-message queue, so concurrent bursts can be processed independently; the remote provider may still impose its own rate limit. On API failure, a small local fallback list is used so moderation does not silently stop.

Self-chat history is stored in each account's session data as `selfchat.json`. Profile pictures are temporarily saved under `saved-profile-pictures` and removed after sending.
