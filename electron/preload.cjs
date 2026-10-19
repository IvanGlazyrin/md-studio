/**
 * Preload script: the only bridge between the renderer and the desktop.
 *
 * The renderer gets a tiny, explicit API — no Node, no remote module.
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  isDesktop: true,
  /** The vault folder the studio reads right now. */
  currentVault: () => ipcRenderer.invoke("vault:current"),
  /** Opens the native folder picker; the studio reloads when the folder changes. */
  chooseVault: () => ipcRenderer.invoke("vault:choose"),
});
