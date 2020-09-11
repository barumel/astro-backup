const chokidar = require('chokidar');
const { get, head, orderBy } = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');

const ASTRO_PATH = get(process.env, 'ASTRO_PATH', path.join('C:', 'astro-server'));
const BACKUP_PATH = get(process.env, 'BACKUP_PATH', path.join('C:', 'astro-backup'));
const MAX_KEEP_FILES = get(process.env, 'MAX_KEEP_FILES', 40);

function createMomentFromFileName(fileName) {
  const date = fileName.substr(7, 10).replace(/\./g, '-');
  const [hour,minute,second] = fileName.substr(18).split('.');

  return moment(date).set({ hour, minute, second, millisecond: 0 });
}

function backup(src, stats) {
  const fileName = path.basename(src);

  const dst = path.join(
    BACKUP_PATH,
    fileName
  );

  fs.copySync(src, dst);

  cleanup();
}

function cleanup() {
  const files = fs.readdirSync(BACKUP_PATH);

  if (MAX_KEEP_FILES === 'ALL' || get(files, 'length', 0) <= MAX_KEEP_FILES) return;

  // Filter files by extension
  const filtered = files.filter((file) => file.endsWith('.savegame'));
  // Order files by date
  const ordered = orderBy(filtered, createMomentFromFileName, ['desc']);

  // Remove old files
  const remove = ordered.slice(MAX_KEEP_FILES);
  remove.forEach((file) => fs.removeSync(path.join(BACKUP_PATH, file)));

}

(function run() {
  fs.ensureDirSync(BACKUP_PATH);

  const saveFilePath = path.join(ASTRO_PATH, 'Astro', 'Saved', 'SaveGames', 'SAVE*.savegame');
  const watcher = chokidar.watch(saveFilePath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true
  });

  watcher.on('change', backup);
  watcher.on('add', backup);
})();
