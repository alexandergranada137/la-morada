import { execFile, spawn } from "node:child_process";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { stripVTControlCharacters } from "node:util";

const noBrowser = process.argv.includes("--no-browser");
const server = spawn(process.execPath, [
  fileURLToPath(new URL("./run-framework.mjs", import.meta.url)),
  "dev", "--hostname", "0.0.0.0",
], {
  // This LAN preview may run alongside the project's existing loopback preview.
  env: { ...process.env, VINEXT_NO_DEV_LOCK: "1", FORCE_COLOR: "0" },
  stdio: ["inherit", "pipe", "inherit"],
});

let announced = false;
let output = "";
server.stdout.setEncoding("utf8");
server.stdout.on("data", chunk => {
  process.stdout.write(chunk);
  if (announced) return;
  output = (output + chunk).slice(-4096);
  const port = stripVTControlCharacters(output).match(/Local:\s+http:\/\/(?:localhost|127\.0\.0\.1):(\d+)\//)?.[1];
  if (!port) return;
  announced = true;
  showAddresses(port).catch(error => console.error(error.message));
});

server.on("error", error => {
  console.error("No se pudo iniciar el servidor:", error.message);
  process.exitCode = 1;
});
server.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
process.on("SIGINT", () => server.kill());

async function showAddresses(port) {
  const local = `http://127.0.0.1:${port}/index.html`;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (server.exitCode !== null || server.signalCode !== null) return;
    const response = await fetch(local, { signal: AbortSignal.timeout(1500) }).catch(() => null);
    if (response?.ok) {
      await response.body?.cancel();
      printAddresses(port, local);
      if (!noBrowser) execFile("explorer.exe", [local], () => {});
      return;
    }
    await response?.body?.cancel();
    await delay(500);
  }
  console.error("El servidor se inicio, pero la portada aun no responde:", local);
}

function printAddresses(port, local) {
  const addresses = [...new Set(Object.values(networkInterfaces()).flat()
    .filter(entry => entry.family === "IPv4" && !entry.internal && !entry.address.startsWith("169.254."))
    .map(entry => entry.address))];

  console.log("\nLa Morada");
  console.log("En esta PC: " + local);
  if (addresses.length) {
    console.log("Desde otros dispositivos en la misma red:");
    for (const address of addresses) console.log(`  http://${address}:${port}/index.html`);
  } else {
    console.log("Conecta esta PC a una red local para compartir el sitio.");
  }
  console.log("Si Windows pregunta, permite el acceso de Node.js en redes privadas.");
  console.log("Deja esta ventana abierta. Usa Ctrl+C para detener el servidor.\n");
}
