# 资源目录

当前版本的飞机、敌人、模块图标、子弹和技能效果全部使用 Canvas 2D 几何图形绘制；背景音乐使用项目根目录的 `梦见天际 Dreaming the Skies.mp3`，战斗音效由 `src/systems/SoundSystem.js` 使用 Web Audio API 实时合成。

以后若加入精灵图、音效或关卡资源，应在此目录保存，并在 `src/config/` 或明确的资源加载模块中登记路径；同时保留 Canvas 图形作为无资源环境下的后备显示，并同步 `docs/ARCHITECTURE.md` 与 `docs/TECHNICAL_DECISIONS.md`。
