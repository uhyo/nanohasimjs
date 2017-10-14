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

    // debug
    /*
    const start = 28564500;
    const end   = 28564600;
    const step  =       1;
    */
    const start = 0;
    const end = 1e20;
    const step = 1e8;
    let counter = total % step;

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

    whileloop: while(true){
        const inst = memory[pc];
        // 上位6bitがopcode
        const opcode = inst >>> 26;
        if (start <= total && counter === step){
            counter = 0;
            console.error(`${total}: ${pc}`);
            if (total >= end){
                process.exit(0);
            }
        }
        counter++;
        total++;
        // console.error(`${total} ${pc}: ${instName(opcode)} ${showInst(inst)}`);
        registers.buf[0] = 0;
        switch (opcode){
            case 0b000000: {
                // add
                // op(inst, registers, ops.add);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                // registers.set(p, registers.get(q) + registers.get(r));
                registers.buf[p] = registers.buf[q] + registers.buf[r];
                break;
            }
            case 0b000001: {
                // addi
                // opi(inst, registers, ops.add);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                // registers.set(p, registers.get(q) + imm);
                registers.buf[p] = registers.buf[q] + imm;
                break;
            }
            case 0b000010: {
                // sub
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf[p] = registers.buf[r] - registers.buf[q];
                break;
            }
            case 0b000011: {
                // subi
                // opi(inst, registers, opsub);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                registers.buf[p] = imm - registers.buf[q];
                break;
            }
            case 0b000100: {
                // rshift
                // op(inst, registers, ops.rshift);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf[p] = ops.rshift(registers.buf[q], registers.buf[r]);
                break;
            }
            case 0b000101: {
                // rshifti
                // opi(inst, registers, ops.rshift);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                registers.buf[p] = ops.rshift(registers.buf[q], imm);
                break;
            }
            case 0b000110: {
                // lshift
                // op(inst, registers, ops.lshift);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf[p] = ops.lshift(registers.buf[q], registers.buf[r]);
                break;
            }
            case 0b000111: {
                // lshifti
                // opi(inst, registers, ops.lshift);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                registers.buf[p] = ops.lshift(registers.buf[q], imm);
                break;
            }
            case 0b001000: {
                // cmpeq
                // op(inst, registers, ops.eq);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf[p] = registers.buf[q] === registers.buf[r] ? 1 : 0;
                break;
            }
            case 0b001001: {
                // cmpeqi
                // opi(inst, registers, ops.eq);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                registers.buf[p] = registers.buf[q] === imm ? 1 : 0;
                break;
            }
            case 0b001010: {
                // cmpgt
                // op(inst, registers, ops.gt);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf[p] = registers.buf[q] > registers.buf[r] ? 1 : 0;
                break;
            }
            case 0b001011: {
                // cmpgti
                // opi(inst, registers, ops.gt);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                registers.buf[p] = registers.buf[q] > imm ? 1 : 0;
                break;
            }
            case 0b001100: {
                // cmplt
                // op(inst, registers, ops.lt);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf[p] = registers.buf[q] < registers.buf[r] ? 1 : 0;
                break;
            }
            case 0b001101:
                // cmplti
                // opi(inst, registers, ops.lt);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                registers.buf[p] = registers.buf[q] < imm ? 1 : 0;
                break;
            case 0b001110: {
                // cmpfeq
                // opf(inst, registers, ops.eq);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf_float[p] = registers.buf_float[q] === registers.buf_float[r] ? 1 : 0;
                break;
            }
            case 0b010000: {
                // cmpfgt
                // opf(inst, registers, ops.gt);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf_float[p] = registers.buf_float[q] > registers.buf_float[r] ? 1 : 0;
                break;
            }
            case 0b010011: {
                // fneg
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                // registers.setf(p, -registers.getf(q));
                registers.buf_float[p] = -registers.buf_float[q];
                break;
            }
            case 0b010101: {
                // fabs
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                // registers.setf(p, Math.abs(registers.getf(q)));
                registers.buf_float[p] = Math.abs(registers.buf_float[q]);
                break;
            }
            case 0b010110: {
                // movi
                const p = (inst >>> 20) & 0b111111;
                let imm = inst & 0xfffff;
                // 符号拡張
                if ((imm & 0x80000) === 0x80000){
                    imm |= 0xfff00000;
                }
                // registers.set(p, imm);
                registers.buf[p] = imm;
                break;
            }
            case 0b010111: {
                // movhiz
                const p = (inst >>> 20) & 0b111111;
                const imm = (inst & 0xfffff) << 12;
                // registers.set(p, imm);
                registers.buf[p] = imm;
                break;
            }
            case 0b011000: {
                // fadd
                // opf(inst, registers, ops.add);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf_float[p] = registers.buf_float[q] + registers.buf_float[r];
                break;
            }
            case 0b011001: {
                // faddi
                // opif(inst, registers, ops.add);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const imm = (inst & 0x3fff) << 18;
                immbuf[0] = imm;
                registers.buf_float[p] = registers.buf_float[q] + immfloatbuf[0];
                break;
            }
            case 0b011010: {
                // fsub
                // opf(inst, registers, ops.sub);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf_float[p] = registers.buf_float[r] - registers.buf_float[q];
                break;
            }
            case 0b011011: {
                // fsubi
                // opif(inst, registers, ops.sub);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const imm = (inst & 0x3fff) << 18;
                immbuf[0] = imm;
                registers.buf_float[p] = immfloatbuf[0] - registers.buf_float[q];
                break;
            }
            case 0b011100: {
                // fmul
                // opf(inst, registers, ops.mul);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const r = (inst >>> 8) & 0b111111;
                registers.buf_float[p] = registers.buf_float[q] * registers.buf_float[r];
                break;
            }
            case 0b011101: {
                // fmuli
                // opif(inst, registers, ops.mul);
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                const imm = (inst & 0x3fff) << 18;
                immbuf[0] = imm;
                registers.buf_float[p] = registers.buf_float[q] * immfloatbuf[0];
                break;
            }
            case 0b011110: {
                // finv
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                // registers.setf(p, 1 / registers.getf(q));
                registers.buf_float[p] = 1 / registers.buf_float[q];
                break;
            }
            case 0b011111: {
                // fsqrt
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                // registers.setf(p, Math.sqrt(registers.getf(q)));
                registers.buf_float[p] = Math.sqrt(registers.buf_float[q]);
                break;
            }
            case 0b100000: {
                // ldi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                // registers.set(p, memory[imm]);
                registers.buf[p] = memory[imm];
                break;
            }
            case 0b100001: {
                // ld
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                // 符号拡張
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                // const addr = (registers.get(q) + imm) & 0xfffff;
                const addr = (registers.buf[q] + imm) & 0xfffff;
                // registers.set(p, memory[addr]);
                registers.buf[p] = memory[addr];
                break;
            }
            case 0b100100: {
                // stoi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                // memory[imm] = registers.get(p);
                memory[imm] = registers.buf[p];
                break;
            }
            case 0b100101: {
                // sto
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                let imm = inst & 0x3fff;
                // 符号拡張
                if ((imm & 0x2000) === 0x2000){
                    imm |= 0xffffc000;
                }
                // const addr = (registers.get(q) + imm) & 0xfffff;
                const addr = (registers.buf[q] + imm) & 0xfffff;
                // memory[addr] = registers.get(p);
                memory[addr] = registers.buf[p];
                break;
            }
            case 0b110000: {
                // jmpz
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                /*
                if (registers.get(p) === 0){
                    pc = registers.get(q);
                    continue whileloop;
                }
                */
                if (registers.buf[p] === 0){
                    pc = registers.buf[q];
                    continue whileloop;
                }
                break;
            }
            case 0b110001: {
                // jmpzi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                /*
                if (registers.get(p) === 0){
                    pc = imm;
                    continue whileloop;
                }
                */
                if (registers.buf[p] === 0){
                    pc = imm;
                    continue whileloop;
                }
                break;
            }
            case 0b110010: {
                // jmp
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                /*
                if (registers.get(p) !== 0){
                    pc = registers.get(q);
                    continue whileloop;
                }
                */
                if (registers.buf[p] !== 0){
                    pc = registers.buf[q];
                    continue whileloop;
                }
                break;
            }
            case 0b110011: {
                // jmpi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                /*
                if (registers.get(p) !== 0){
                    pc = imm;
                    continue whileloop;
                }
                */
                if (registers.buf[p] !== 0){
                    pc = imm;
                    continue whileloop;
                }
                break;
            }
            case 0b110100: {
                // call
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0x3fff;
                // registers.set(p, pc+1);
                registers.buf[p] = pc+1;
                pc = imm;
                continue whileloop;
            }
            case 0b111100: {
                // out
                const p = (inst >>> 20) & 0b111111;
                // process.stdout.write(String.fromCharCode(registers.get(p) & 0xff));
                process.stdout.write(String.fromCharCode(registers.buf[p] & 0xff));
                break;
            }
            case 0b111101: {
                // in
                const val = stdin.readByte();
                if (val == null){
                    // 読めない
                    total--;
                    break whileloop;
                }
                const p = (inst >>> 20) & 0b111111;
                // registers.set(p, val);
                registers.buf[p] = val;
                break;
            }
            case 0b111111: {
                // halt
                state.end = true;
                break whileloop;
            }
            default: {
                throw new Error(`Not Supported
inst: ${showInst(inst)}
pc: ${pc}`);
            }
        }
        pc += 1;
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
