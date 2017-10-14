// Registers object.
export class Registers{
    private buf: Uint32Array;
    private buf_float: Float32Array;
    constructor(){
        this.buf = new Uint32Array(64);
        this.buf_float = new Float32Array(this.buf.buffer);
    }
    set(idx: number, value: number): void{
        this.buf[idx] = value;
    }
    get(idx: number): number{
        if (idx === 0){
            return 0;
        } else {
            // 32bit数値として扱う
            return this.buf[idx] | 0;
        }
    }
    setf(idx: number, value: number): void{
        this.buf_float[idx] = value;
    }
    getf(idx: number): number{
        if (idx === 0){
            return 0;
        } else {
            return this.buf_float[idx];
        }
    }
}
