const fs = require('fs/promises');
const path = require('path');
const inspector = require('inspector');
const { promisify } = require('util');

const [,, encoderName, folderPath, method, modulePath] = process.argv;
const { createByEncoderName } = require(modulePath);
const minTime = 10_000;
const minCycles = 5;

const fileExtensions = ['.ts', '.js', '.py'];

async function readAllFilesInFolder(folderPath) {
  const files = await fs.readdir(folderPath, { withFileTypes: true });
  const fileContents = await Promise.all(files.map(async (file) => {
    const res = path.resolve(folderPath, file.name);
    if (file.isDirectory()) {
      return readAllFilesInFolder(res);
    } else if (fileExtensions.some(f => res.endsWith(f))) {
      return fs.readFile(res, 'utf8');
    } else {
      return [];
    }
  }));

  return fileContents.flat();
}

Promise.all([
  readAllFilesInFolder(folderPath),
  createByEncoderName(encoderName)
]).then(async ([files, tokenizer]) => {
  let totalSize = 0;
  for (const file of files) {
    totalSize += file.length;
  }

  const session = new inspector.Session();
  session.connect();
  const post = promisify(session.post).bind(session);
  await post('Profiler.enable');
  await post('Profiler.start');

  const start = performance.now();
  let cycles = [];
  while (performance.now() - start < minTime || cycles.length < minCycles) {
    const cycleStart = performance.now();
    switch (method) {
      case 'encode':
        files.forEach(file => tokenizer.encode(file));
        break;
      case 'encodeTrimSuffix':
        files.forEach(file => tokenizer.encodeTrimSuffix(file, 1337));
        break;
      default:
        throw new Error(`unknown method ${method}`);
    }
    cycles.push(performance.now() - cycleStart);
  }

  const data = await post('Profiler.stop');
  await fs.writeFile('profile.cpuprofile', JSON.stringify(data.profile));

  process.stdout.write(JSON.stringify({ totalSize, cycles }));
});
