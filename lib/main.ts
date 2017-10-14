import {
    Registers,
} from './registers';
import {
    StdinBuf,
} from './io';
import {
    showInst,
    instName,
} from './util';

export interface State{
    stdin: StdinBuf,
    memory: Uint32Array;
    registers: Registers,
    pc: number;
    total: number;
    end: boolean;
}

export async function main(file: Buffer): Promise<State>{
    const memory = new Uint32Array(1048576);
    // メモリを生成
    for (let i = 0; i < file.length / 4; i++){
        memory[i] = file.readUInt32LE(i * 4);
    }
    const registers = initRegisters();
    const stdin = new StdinBuf();
    const state: State = {
        stdin,
        memory,
        registers,
        pc: 0,
        total: 0,
        end: false,
    };
    while (true){
        mainLoop(state);
        if (state.end){
            break;
        }
        // 入力を待つ
        // console.error('waiting for input');
        await state.stdin.wait();
    }
    return state;
}

// Main loop.
function mainLoop(state: State): void{
    const {
        stdin,
        memory,
        registers,
    } = state;
    let {
        pc,
        total,
    } = state;


    const ops = {
        rshift(x: number, y: number){
            if (y >= 0){
                return x >>> (y & 0x1f);
            } else {
                return x << ((-y) & 0x1f);
            }
        },
        lshift(x: number, y: number){
            if (y >= 0){
                return x << (y & 0x1f);
            } else {
                return x >>> ((-y) & 0x1f);
            }
        },
    };
    // 即値変換用
    const immbuf = new Int32Array(1);
    const immfloatbuf = new Float32Array(immbuf.buffer);

    // debug
    const start = 0;
    const end =   1e20;
    const step =     1e8;
    let counter = (total - start) % step;

    while(true){
        const inst = memory[pc];
        // 上位6bitがopcode
        const opcode = inst >>> 26;
        if (counter === step){
            counter = 0;
            if (start <= total){
                console.error(`${total}: ${pc}: ${opcode} r1=${registers.buf[1]} r2=${registers.buf[2]} r3=${registers.buf[3]} r4=${registers.buf[4]}`);
                if (total >= end){
                    process.exit(0);
                }
            }
        }
        counter++;
        total++;
        // console.error(`${total} ${pc}: ${instName(opcode)} ${showInst(inst)}`);
        registers.buf[0] = 0;
        if (opcode & 0b100000){
            // 1xxxxx
            if (opcode & 0b010000) {
                // 11xxxx
                if (opcode & 0b001000) {
                    // 111xxx
                    if (opcode === 0b111100){
                        // 111100: out
                        const p = (inst >>> 20) & 0b111111;
                        process.stdout.write(String.fromCharCode(registers.buf[p] & 0xff));
                        pc++;
                        continue;
                    } else if (opcode === 0b111101){
                        // 111101: in
                        const val = stdin.readByte();
                        if (val == null){
                            // 読めない
                            total--;
                            break;
                        }
                        const p = (inst >>> 20) & 0b111111;
                        registers.buf[p] = val;
                        pc++;
                        continue;
                    } else if (opcode === 0b111111){
                        // 111111: halt
                        state.end = true;
                        break;
                    }
                } else {
                    // 110xxx
                    if (opcode & 0b000100){
                        // 1101xx
                        if (opcode === 0b110100){
                            // 110100: call
                            const p = (inst >>> 20) & 0b111111;
                            const imm = inst & 0x3fff;
                            registers.buf[p] = pc+1;
                            pc = imm;
                            continue;
                        }
                    } else {
                        // 1100xx
                        if (opcode & 0b000010){
                            // 11001x
                            if (opcode & 0b000001){
                                // 110011: jmpi
                                const p = (inst >>> 20) & 0b111111;
                                const imm = inst & 0xfffff;
                                if (registers.buf[p] !== 0){
                                    pc = imm;
                                } else {
                                    pc++;
                                }
                                continue;
                            } else {
                                // 110010: jmp
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                if (registers.buf[p] !== 0){
                                    pc = registers.buf[q];
                                } else {
                                    pc++;
                                }
                                continue;
                            }
                        } else {
                            // 11000x
                            if (opcode & 0b000001){
                                // 110001: jmpzi
                                const p = (inst >>> 20) & 0b111111;
                                const imm = inst & 0xfffff;
                                if (registers.buf[p] === 0){
                                    pc = imm;
                                } else {
                                    pc++;
                                }
                                continue;
                            } else {
                                // 110000: jmpz
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                if (registers.buf[p] === 0){
                                    pc = registers.buf[q];
                                } else {
                                    pc++;
                                }
                                continue;
                            }
                        }
                    }
                }
            } else {
                // 10xxxx
                if (!(opcode & 0b001110)){
                    // 10000x
                    if (opcode & 0b000001){
                        // 100001: ld
                        const p = (inst >>> 20) & 0b111111;
                        const q = (inst >>> 14) & 0b111111;
                        let imm = inst & 0x3fff;
                        // 符号拡張
                        if ((imm & 0x2000) === 0x2000){
                            imm |= 0xffffc000;
                        }
                        const addr = (registers.buf[q] + imm) & 0xfffff;
                        registers.buf[p] = memory[addr];
                        pc++;
                        continue;
                    } else {
                        // 100000: ldi
                        const p = (inst >>> 20) & 0b111111;
                        const imm = inst & 0xfffff;
                        registers.buf[p] = memory[imm];
                        pc++;
                        continue;
                    }
                } else if ((opcode & 0b001110) === 0b000100){
                    // 10010x
                    if (opcode & 0b000001){
                        // 100101: sto
                        const p = (inst >>> 20) & 0b111111;
                        const q = (inst >>> 14) & 0b111111;
                        let imm = inst & 0x3fff;
                        // 符号拡張
                        if ((imm & 0x2000) === 0x2000){
                            imm |= 0xffffc000;
                        }
                        const addr = (registers.buf[q] + imm) & 0xfffff;
                        memory[addr] = registers.buf[p];
                        pc++;
                        continue;
                    } else {
                        // 100100: stoi
                        const p = (inst >>> 20) & 0b111111;
                        const imm = inst & 0xfffff;
                        memory[imm] = registers.buf[p];
                        pc++;
                        continue;
                    }
                }
            }
        } else {
            // 0xxxxx
            if (opcode & 0b010000){
                // 01xxxx
                if (opcode & 0b001000){
                    // 011xxx
                    if (opcode & 0b000100){
                        // 0111xx
                        if (opcode & 0b000010){
                            // 01111x
                            if (opcode & 0b000001){
                                // 011111: fsqrt
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                registers.buf_float[p] = Math.sqrt(registers.buf_float[q]);
                                pc++;
                                continue;
                            } else {
                                // 011110: finv
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                registers.buf_float[p] = 1 / registers.buf_float[q];
                                pc++;
                                continue;
                            }
                        } else {
                            // 01110x
                            if (opcode & 0b000001){
                                // 011101: fmuli
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const imm = (inst & 0x3fff) << 18;
                                immbuf[0] = imm;
                                registers.buf_float[p] = registers.buf_float[q] * immfloatbuf[0];
                                pc++;
                                continue;
                            } else {
                                // 011100: fmul
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf_float[p] = registers.buf_float[q] * registers.buf_float[r];
                                pc++;
                                continue;
                            }
                        }
                    } else {
                        // 0110xx
                        if (opcode & 0b000010){
                            // 01101x
                            if (opcode & 0b000001){
                                // 011011: fsubi
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const imm = (inst & 0x3fff) << 18;
                                immbuf[0] = imm;
                                registers.buf_float[p] = immfloatbuf[0] - registers.buf_float[q];
                                pc++;
                                continue;
                            } else {
                                // 011010: fsub
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf_float[p] = registers.buf_float[r] - registers.buf_float[q];
                                pc++;
                                continue;
                            }
                        } else {
                            // 01100x
                            if (opcode & 0b000001){
                                // 011001: faddi
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const imm = (inst & 0x3fff) << 18;
                                immbuf[0] = imm;
                                registers.buf_float[p] = registers.buf_float[q] + immfloatbuf[0];
                                pc++;
                                continue;
                            } else {
                                // 011000: fadd
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf_float[p] = registers.buf_float[q] + registers.buf_float[r];
                                pc++;
                                continue;
                            }
                        }
                    }
                } else {
                    // 010xxx
                    if (opcode & 0b000100){
                        // 0101xx
                        if (opcode & 0b000010){
                            // 01011x
                            if (opcode & 0b000001){
                                // 010111: movhiz
                                const p = (inst >>> 20) & 0b111111;
                                const imm = (inst & 0xfffff) << 12;
                                registers.buf[p] = imm;
                                pc++;
                                continue;
                            } else {
                                // 010110: movi
                                const p = (inst >>> 20) & 0b111111;
                                let imm = inst & 0xfffff;
                                // 符号拡張
                                if ((imm & 0x80000) === 0x80000){
                                    imm |= 0xfff00000;
                                }
                                registers.buf[p] = imm;
                                pc++;
                                continue;
                            }
                        } else if (opcode === 0b010101){
                            // 010101: fabs
                            const p = (inst >>> 20) & 0b111111;
                            const q = (inst >>> 14) & 0b111111;
                            registers.buf_float[p] = Math.abs(registers.buf_float[q]);
                            pc++;
                            continue;
                        }
                    } else {
                        // 0100xx
                        if (opcode === 0b010000){
                            // 010000: cmpfgt
                            const p = (inst >>> 20) & 0b111111;
                            const q = (inst >>> 14) & 0b111111;
                            const r = (inst >>> 8) & 0b111111;
                            registers.buf_float[p] = registers.buf_float[q] > registers.buf_float[r] ? 1 : 0;
                            pc++;
                            continue;
                        } else if (opcode === 0b010011){
                            // 010011: fneg
                            const p = (inst >>> 20) & 0b111111;
                            const q = (inst >>> 14) & 0b111111;
                            registers.buf_float[p] = -registers.buf_float[q];
                            pc++;
                            continue;
                        }
                    }
                }
            } else {
                // 00xxxx
                if (opcode & 0b001000){
                    // 001xxx
                    if (opcode & 0b000100){
                        // 0011xx
                        if (opcode & 0b000010){
                            // 00111x
                            if (!(opcode & 0b000001)){
                                // 001110: cmpfeq
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf_float[p] = registers.buf_float[q] === registers.buf_float[r] ? 1 : 0;
                                pc++;
                                continue;
                            }
                        } else {
                            // 00110x
                            if (opcode & 0b000001){
                                // 001101: cmplti
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = registers.buf[q] < imm ? 1 : 0;
                                pc++;
                                continue;
                            } else {
                                // 001100: cmplt
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = registers.buf[q] < registers.buf[r] ? 1 : 0;
                                pc++;
                                continue;
                            }
                        }
                    } else {
                        // 0010xx
                        if (opcode & 0b000010){
                            // 00101x
                            if (opcode & 0b000001){
                                // 001011: cmpgti
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = registers.buf[q] > imm ? 1 : 0;
                                pc++;
                                continue;
                            } else {
                                // 001010: cmpgt
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = registers.buf[q] > registers.buf[r] ? 1 : 0;
                                pc++;
                                continue;
                            }
                        } else {
                            // 00100x
                            if (opcode & 0b000001){
                                // 001001: cmpeqi
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = registers.buf[q] === imm ? 1 : 0;
                                pc++;
                                continue;
                            } else {
                                // 001000: cmpeq
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = registers.buf[q] === registers.buf[r] ? 1 : 0;
                                pc++;
                                continue;
                            }
                        }
                    }
                } else {
                    // 000xxx
                    if (opcode & 0b000100){
                        // 0001xx
                        if (opcode & 0b000010){
                            // 00011x
                            if (opcode & 0b000001){
                                // 000111: lshifti
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = ops.lshift(registers.buf[q], imm);
                                pc++;
                                continue;
                            } else {
                                // 000110: lshift
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = ops.lshift(registers.buf[q], registers.buf[r]);
                                pc++;
                                continue;
                            }
                        } else {
                            // 00010x
                            if (opcode & 0b000001){
                                // 000101: rshifti
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = ops.rshift(registers.buf[q], imm);
                                pc++;
                                continue;
                            } else {
                                // 000100: rshift
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = ops.rshift(registers.buf[q], registers.buf[r]);
                                pc++;
                                continue;
                            }
                        }
                    } else {
                        // 0000xx
                        if (opcode & 0b000010){
                            // 00001x
                            if (opcode & 0b000001){
                                // 000011: subi
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = imm - registers.buf[q];
                                pc++;
                                continue;
                            } else {
                                // 000010: sub
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = registers.buf[r] - registers.buf[q];
                                pc++;
                                continue;
                            }
                        } else {
                            // 00000x
                            if (opcode){
                                // 000001: addi
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                let imm = inst & 0x3fff;
                                if ((imm & 0x2000) === 0x2000){
                                    imm |= 0xffffc000;
                                }
                                registers.buf[p] = registers.buf[q] + imm;
                                pc++;
                                continue;
                            } else {
                                // 000000: add
                                const p = (inst >>> 20) & 0b111111;
                                const q = (inst >>> 14) & 0b111111;
                                const r = (inst >>> 8) & 0b111111;
                                registers.buf[p] = registers.buf[q] + registers.buf[r];
                                pc++;
                                continue;
                            }
                        }
                    }
                }
            }
        }
        // Unrecognized opcode
        throw new Error(`Not Supported
inst: ${showInst(inst)}
pc: ${pc}`);
    }
    state.pc = pc;
    state.total = total;
}

/*
// perform an ALU operation.
function op(inst: number, registers: Registers, func: (x: number, y: number)=>number): void{
    // 目的のレジスタ
    const p = (inst >>> 20) & 0b111111;
    // 左
    const q = (inst >>> 14) & 0b111111;
    // 右
    const r = (inst >>> 8) & 0b111111;

    registers.set(p, func(registers.get(q), registers.get(r)));
}
// ALU 即値 operation
function opi(inst: number, registers: Registers, func: (x: number, y: number)=>number): void{
    const p = (inst >>> 20) & 0b111111;
    const q = (inst >>> 14) & 0b111111;
    let imm = inst & 0x3fff;
    // 符号拡張
    if ((imm & 0x2000) === 0x2000){
        imm |= 0xffffc000;
    }

    registers.set(p, func(registers.get(q), imm));
}
// FPU
function opf(inst: number, registers: Registers, func: (x: number, y: number)=>number): void{
    // 目的のレジスタ
    const p = (inst >>> 20) & 0b111111;
    // 左
    const q = (inst >>> 14) & 0b111111;
    // 右
    const r = (inst >>> 8) & 0b111111;

    registers.setf(p, func(registers.getf(q), registers.getf(r)));
}
// FPU 即値 operation
function opif(inst: number, registers: Registers, func: (x: number, y: number)=>number): void{
    const p = (inst >>> 20) & 0b111111;
    const q = (inst >>> 14) & 0b111111;
    const imm = (inst & 0x3fff) << 18;

    registers.setf(p, func(registers.getf(q), bytesFloat(imm)));
}
*/

// Init a register.
function initRegisters(): Registers{
    return new Registers();
}
