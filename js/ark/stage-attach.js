/* THE STAGE'S NAME IN THE SHELL. Layer: app (the site).
   js/ark/stage.js runs before the shell (index.html loads it right after js/loader-plaza.js, so the home's 3D frame starts early) and makes
   window.ArkStage. js/ark/runtime.js makes ArkUI when the shell's scripts arrive, after that. This file stands in the shell's list where stage.js
   stood and gives the stage the name the pages use: ArkUI.stage (js/pages/intro.js, js/pages/topic.js).
   A document that loads the shell without the early script has no stage: ArkUI.stage stays undefined, and each page says so in its own place. */
if (typeof window !== 'undefined' && window.ArkStage && window.ArkUI) window.ArkUI.stage = window.ArkStage;
