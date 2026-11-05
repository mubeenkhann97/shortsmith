# Changelog

What changed for people using the product. Newest dates are first.

Shortsmith is based on [SupoClip](https://github.com/FujiwaraChoki/supoclip) (AGPL-3.0). Its earlier history is in the SupoClip repository.

Add a line here when a change affects something a user can see. Use **New**, **Improved**, **Fixed**, or **Under the hood**, describe the change in plain language, and link the pull request or commit. Do not include customer names, email addresses, user IDs, or anything else private.

## 2026-11-05

- **New:** First Shortsmith release, based on SupoClip: turn long videos (uploads up to 4 GB, or YouTube, Twitch and Kick links) into captioned 9:16 clips with face-centred cropping and an editor. ([SupoClip](https://github.com/FujiwaraChoki/supoclip))
- **New:** Free local mode by default: transcription runs on local Whisper and clip selection on a local Ollama model, so no API keys are needed. ([Install guide](https://github.com/mubeenkhann97/shortsmith#install-on-a-new-computer-free-and-local))
- **New:** Bring your own key: add your own OpenAI, Anthropic, Google Gemini, OpenRouter or AssemblyAI key under Settings → AI models and choose the model used for your videos. Keys are encrypted and only used for your own jobs. ([Cloud models](https://github.com/mubeenkhann97/shortsmith#using-cloud-models))
- **Improved:** Sign out from Settings on any screen size, and the home page no longer flashes the landing page when you are already signed in. ([Shortsmith](https://github.com/mubeenkhann97/shortsmith))
