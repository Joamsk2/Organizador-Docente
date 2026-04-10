const { exec } = require('child_process');
exec('npx tsc --noEmit', { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
    console.log('---STDOUT---');
    console.log(stdout.replace(/\x1b\[[0-9;]*m/g, ''));
    console.log('---STDERR---');
    console.log(stderr.replace(/\x1b\[[0-9;]*m/g, ''));
});
