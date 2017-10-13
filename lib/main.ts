import {
    Registers,
} from './registers';
import {
    bytesFloat,
    floatBytes,
    fneg,
    fabs,
    fadd,
    fsub,
    fmul,
    finv,
    fsqrt,
} from './float';
import {
    StdinBuf,
} from './io';
import {
    showInst,
    instName,
} from './util';

interface State{
    stdin: StdinBuf,
    memory: Uint32Array;
    registers: Registers,
    pc: number;
    total: number;
    end: boolean;
}

export async function main(file: Buffer): Promise<void>{
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

    whileloop: while(true){
        const inst = memory[pc];
        // 上位6bitがopcode
        const opcode = inst >>> 26;
        if (start <= total && total % step === 0){
            console.error(`${total}: ${pc}: ${opcode} r1=${registers.get(1)} r2=${registers.get(2)} r3=${registers.get(3)} r6=${registers.get(6)} r10=${registers.get(10)} r30=${registers.get(30)} r63=${registers.get(63)} mem24584=${memory[24584]}`);
            if (total >= end){
                process.exit(0);
            }
        }
        total++;
        // console.error(`${total} ${pc}: ${instName(opcode)} ${showInst(inst)}`);
        switch (opcode){
            case 0b000000:
                // add
                op(inst, registers, (x, y)=>x+y);
                break;
            case 0b000001:
                // addi
                opi(inst, registers, (x, y)=>x+y);
                break;
            case 0b000010:
                // sub
                op(inst, registers, (x, y)=>y-x);
                break;
            case 0b000011:
                // subi
                opi(inst, registers, (x, y)=>y-x);
                break;
            case 0b000100:
                // rshift
                op(inst, registers, (x, y)=>{
                    if (y >= 0){
                        return x >>> (y & 0x1f);
                    } else {
                        return x << ((-y) & 0x1f);
                    }
                });
                break;
            case 0b000101:
                // rshifti
                opi(inst, registers, (x, y)=>{
                    if (y >= 0){
                        return x >>> (y & 0x1f);
                    } else {
                        return x << ((-y) & 0x1f);
                    }
                });
                break;
            case 0b000110:
                // lshift
                op(inst, registers, (x, y)=>{
                    if (y >= 0){
                        return x << (y & 0x1f);
                    } else {
                        return x >>> ((-y) & 0x1f);
                    }
                });
                break;
            case 0b000111:
                // lshifti
                opi(inst, registers, (x, y)=>{
                    if (y >= 0){
                        return x << (y & 0x1f);
                    } else {
                        return x >>> ((-y) & 0x1f);
                    }
                });
                break;
            case 0b001000:
                // cmpeq
                op(inst, registers, (x, y)=> x===y ? 1 : 0);
                break;
            case 0b001001:
                // cmpeqi
                opi(inst, registers, (x, y)=> x===y ? 1 : 0);
                break;
            case 0b001010:
                // cmpgt
                op(inst, registers, (x, y)=> x>y ? 1 : 0);
                break;
            case 0b001011:
                // cmpgti
                opi(inst, registers, (x, y)=> x>y ? 1 : 0);
                break;
            case 0b001100:
                // cmplt
                op(inst, registers, (x, y)=> x<y ? 1 : 0);
                break;
            case 0b001101:
                // cmplti
                opi(inst, registers, (x, y)=> x<y ? 1 : 0);
                break;
            case 0b001110:
                // cmpfeq
                op(inst, registers, (x, y)=> bytesFloat(x) === bytesFloat(y) ? 1 : 0);
                break;
            case 0b010000:
                // cmpfgt
                op(inst, registers, (x, y)=> bytesFloat(x) > bytesFloat(y) ? 1 : 0);
                break;
            case 0b010011: {
                // fneg
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                registers.set(p, fneg(registers.get(q)));
                break;
            }
            case 0b010101: {
                // fabs
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                registers.set(p, fabs(registers.get(q)));
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
                registers.set(p, imm);
                break;
            }
            case 0b010111: {
                // movhiz
                const p = (inst >>> 20) & 0b111111;
                const imm = (inst & 0xfffff) << 12;
                registers.set(p, imm);
                break;
            }
            case 0b011000: {
                // fadd
                op(inst, registers, (x, y)=> fadd(x, y));
                break;
            }
            case 0b011001: {
                // faddi
                opif(inst, registers, (x, y)=> fadd(x, y));
                break;
            }
            case 0b011010: {
                // fsub
                op(inst, registers, (x, y)=> fsub(y, x));
                break;
            }
            case 0b011011: {
                // fsubi
                opif(inst, registers, (x, y)=> fsub(y, x));
                break;
            }
            case 0b011100: {
                // fmul
                op(inst, registers, (x, y)=> fmul(x, y));
                break;
            }
            case 0b011101: {
                // fmuli
                opif(inst, registers, (x, y)=> fmul(x, y));
                break;
            }
            case 0b011110: {
                // finv
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                registers.set(p, finv(registers.get(q)));
                break;
            }
            case 0b011111: {
                // fsqrt
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                registers.set(p, fsqrt(registers.get(q)));
                break;
            }
            case 0b100000: {
                // ldi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                registers.set(p, memory[imm]);
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
                const addr = (registers.get(q) + imm) & 0xfffff;
                registers.set(p, memory[addr]);
                break;
            }
            case 0b100100: {
                // stoi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                memory[imm] = registers.get(p);
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
                const addr = (registers.get(q) + imm) & 0xfffff;
                memory[addr] = registers.get(p);
                break;
            }
            case 0b110000: {
                // jmpz
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                if (registers.get(p) === 0){
                    pc = registers.get(q);
                    continue whileloop;
                }
                break;
            }
            case 0b110001: {
                // jmpzi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                if (registers.get(p) === 0){
                    pc = imm;
                    continue whileloop;
                }
                break;
            }
            case 0b110010: {
                // jmp
                const p = (inst >>> 20) & 0b111111;
                const q = (inst >>> 14) & 0b111111;
                if (registers.get(p) !== 0){
                    pc = registers.get(q);
                    continue whileloop;
                }
                break;
            }
            case 0b110011: {
                // jmpi
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0xfffff;
                if (registers.get(p) !== 0){
                    pc = imm;
                    continue whileloop;
                }
                break;
            }
            case 0b110100: {
                // call
                const p = (inst >>> 20) & 0b111111;
                const imm = inst & 0x3fff;
                registers.set(p, pc+1);
                pc = imm;
                continue whileloop;
            }
            case 0b111100: {
                // out
                const p = (inst >>> 20) & 0b111111;
                process.stdout.write(String.fromCharCode(registers.get(p) & 0xff));
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
                registers.set(p, val);
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
// FPU 即値 operation
function opif(inst: number, registers: Registers, func: (x: number, y: number)=>number): void{
    const p = (inst >>> 20) & 0b111111;
    const q = (inst >>> 14) & 0b111111;
    const imm = (inst & 0x3fff) << 18;

    registers.set(p, func(registers.get(q), imm));
}

// Init a register.
function initRegisters(): Registers{
    return new Registers();
}
