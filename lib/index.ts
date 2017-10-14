import * as fs from 'fs';
import {
    main,
} from './main';

// 計測開始
const start_time = Date.now();

// get input file
const input = process.argv[2];

// load the instruction file.
const fileData = fs.readFileSync(input);
// read the first 4 bytes (file size)
const fileSize = fileData.readUInt32LE(0);
// console.assert(fileSize * 4 + 4 === fileData.length);

// main memory.
const memory = fileData.slice(4);

main(memory)
.then(state=>{
    const end_time = Date.now();
    const diff = end_time - start_time;
    console.error(`${diff} ms (${diff * 1e8 / state.total} ms / 1e8 ops)`);
})
.catch(err=>{
    console.error(err);
    process.exit(1);
});
