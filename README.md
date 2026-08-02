# Neon Skies

Native HTML5 Canvas vertical shooter. There is no build step and no third-party dependency. Build a custom airframe by dragging modules onto the fixed 15x15 core network.

## Run

Open `index.html`. If the browser blocks ES Modules from `file://`, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

Then open `http://localhost:5500/`. Logic tests are at `/tests/index.html`.

## Publish and update

This is a static project and does not need `npm`, a build command, or a database.

### Netlify first publish

Upload the contents of `publish-package` to Netlify, or upload `neon-skies-publish.zip` when Netlify asks for a site folder/archive. The published site entry file is `index.html`.

To rebuild only the directly uploadable folder, use `powershell -ExecutionPolicy Bypass -File .\package-release.ps1 -FolderOnly`.

### Updating after a code change

1. Edit the original project files in this folder.
2. Test the game at `http://127.0.0.1:5500/`.
3. Recreate the publish package so it contains the newest `index.html`, `styles.css`, `src/`, and `assets/`.
4. In Netlify, open the same site and use **Deploys → Deploy manually**, then upload the new `publish-package` folder or ZIP.

Do not upload only the changed JavaScript file: upload the complete package so all module imports and styles stay in sync.

## Modes and controls

- The main menu opens a mode screen. **Endless** starts the original endless battle; **Level** opens a 5-column grid of 25 unlocked stages.
- Normal stages clear after reaching their score target. Stages 5, 10, 15, 20 and 25 first reach the target, then spawn a moving boss that must be defeated.
- Higher stages increase enemy health, speed, spawn cadence, and unlock advanced enemy movement/abilities. Bosses stay in the upper half and fire fan-shaped barrages.
- The battle HUD pause button opens continue/return choices. Returning to the main menu requires a second confirmation.

- Keyboard: WASD or arrow keys to move; number keys 1-9 activate skills.
- Touch: drag on the canvas to move. Skill buttons appear at lower-left and can be pressed with another finger.
- The player auto-fires. The main menu battle button uses the current build directly.

## Assembly

The core stays in the center of a 15x15 board. Drag modules from the vertical four-column module bay. A translucent preview shows the footprint. On release, geometry, overlap, and core connectivity are checked; disconnected modules are removed. Click an installed module for details.

The **快捷装配** switch is above the core network. When enabled, click a module in the bay to select it, then click valid cells on the network to install it repeatedly without opening the detail panel. Turn it off to restore the normal detail-click behavior.

Current weapons: electric whirlwind, nest, ricochet, ball lightning, and psionic.

Current specials: optical decoy, wingman, ion chainsaw, sonic strings, and zero domain.

## Structure

```text
index.html                 menu, assembly, battle and HUD
styles.css                 portrait game styling
src/config/                player, enemy, level and module data
src/core/Game.js           game state, loop and rendering
src/entities/              player, enemy, projectile, decoy and wingman
src/systems/                input, modules, weapons, skills and collisions
src/ui/UI.js               menu, module bay, assembly preview and HUD
src/rendering/              Canvas geometry icons
tests/                     standalone logic and import smoke tests
assets/                    reserved for future resources
```

## Add content

Add a module configuration to `src/config/module-config.js`. Reuse an existing behavior type where possible. For a new flight pattern, add a behavior factory in `src/systems/WeaponSystem.js`; the player and main loop do not need module-specific branches.

Attribute modules use `modifiers`, for example:

```js
modifiers: { maxHp: { add: 2, multiply: 1 }, moveSpeed: { add: 0, multiply: 1 } }
```

Enemy definitions live in `src/config/enemy-config.js`. Spawn cadence and difficulty growth live in `src/config/level-config.js`.

## Tests and limitations

The test page covers the 15x15 board, multi-cell modules, stat merging, module loading, module fire origins, nest spread delay, electric whirlwind area damage, skill cooldowns, pruning, and circle collisions.

Story, networking, accounts, leaderboards, saves, drops, audio, external art, and in-battle module replacement are not implemented yet. All 25 stages are intentionally unlocked during testing.
