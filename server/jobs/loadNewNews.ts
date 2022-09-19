import { parentPort } from "node:worker_threads";
import process from "node:process";
import { prisma } from "../lib/db";

(async () => {
  if (parentPort) {
    const user = await prisma.user.findFirst({});
    parentPort.postMessage(`User ID: ${user?.id}`);
    parentPort.postMessage("done");
  } else process.exit(0);
})();
