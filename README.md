# bringppttest v4.1.11 ChatGPT Agent Builder package

This repository contains the `bringppttest` test skill package for ChatGPT Agent Builder.

## Package

The ready-to-upload skill archive is:

`dist/bringppttest-v4.1.11-chatgpt-fixed.zip`

## Key behavior

- Skill front matter name: `bringppttest`
- First-line sentinel for production/diagnostic runs: `BRINGPPT_SKILL_MOUNTED`
- Uses BRING/薄云 PPT generation pipeline
- Uses `jszip` for PPTX package edits instead of platform `zip/unzip`
- Includes Google Drive default archive requirement for generated PPTX files
- Default Drive folder: `Bring AI Workspace/AI Output/PPT`
- Default Drive folder id: `10cQkBoa86WdwdlUSEZsebQao1wh_gz2O`

## Smoke status

- `npm run doctor`: passed
- Minimal storyboard pipeline: passed
- `validate:all`: 0 ERROR / 3 WARN in smoke test
