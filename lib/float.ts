// float arithmetic.
// Currently uses double.

const buffloat = new Float32Array(1);
const bufint = new Uint32Array(buffloat.buffer);

// bytes to Float.
export function bytesFloat(bytes: number): number{
    bufint[0] = bytes;
    return buffloat[0];
}

// float to bytes.
export function floatBytes(num: number): number{
    buffloat[0] = num;
    return bufint[0];
}

// negation of float.
export function fneg(bytes: number): number{
    return floatBytes(-bytesFloat(bytes));
}

// abs of float.
export function fabs(bytes: number): number{
    return floatBytes(Math.abs(bytesFloat(bytes)));
}

// fadd
export function fadd(x: number, y: number): number{
    return floatBytes(bytesFloat(x) + bytesFloat(y));
}

// fsub
export function fsub(x: number, y: number): number{
    return floatBytes(bytesFloat(x) - bytesFloat(y));
}

// fmul
export function fmul(x: number, y: number): number{
    return floatBytes(bytesFloat(x) * bytesFloat(y));
}

// finv
export function finv(x: number): number{
    return floatBytes(1 / bytesFloat(x));
}

// fsqrt
export function fsqrt(x: number): number{
    return floatBytes(Math.sqrt(bytesFloat(x)));
}
