// debugging utility.

// Format a instruction code.
export function showInst(inst: number): string{
    const str1 = inst.toString(2);
    const str2 = '0'.repeat(32 - str1.length) + str1;
    return str2.replace(/.{8}/g, (str)=>`${str} `);
}

// instruction name.
export function instName(opcode: number){
    const n = [
        // 000000
        'add',
        'addi',
        'sub',
        'subi',
        'rshift',
        'rshifti',
        'lshift',
        'lshifti',
        // 001000
        'cmpeq',
        'cmpeqi',
        'cmpgt',
        'cmpgti',
        'cmplt',
        'cmplti',
        'cmpfeq',
        '(cmpfeqi)',
        // 010000
        'cmpfgt',
        '(cmpfgti)',
        // 010010
        '???',
        'fneg',
        '???',
        'fabs',
        // 010110
        'movi',
        'movhiz',
        // 011000
        'fadd',
        'faddi',
        'fsub',
        'fsubi',
        'fmul',
        'fmuli',
        'finv',
        'fsqrt',
        // 100000
        'ldi',
        'ld',
        '???',
        '???',
        // 100100
        'stoi',
        'sto',
        '???',
        '???',
        // 101000
        '???',
        '???',
        '???',
        '???',
        '???',
        '???',
        '???',
        '???',
        // 110000
        'jmpz',
        'jmpzi',
        'jmp',
        'jmpi',
        'call',
        // 110101
        '???',
        '???',
        '???',
        // 111000
        '???',
        '???',
        '???',
        '???',
        // 111100
        'out',
        'in',
        '(cpuid)',
        'halt',
    ][opcode];
    if (!n || n.length >= 10){
        return n;
    } else{
        return n + ' '.repeat(10 - n.length);
    }
}
