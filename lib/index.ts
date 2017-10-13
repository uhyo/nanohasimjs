import * as fs from 'fs';
import {
    main,
} from './main';

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
.catch(err=>{
    console.error(err);
    process.exit(1);
});
