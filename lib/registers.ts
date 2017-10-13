// Registers object.
export class Registers{
    private buf: Uint32Array;
    constructor(){
        this.buf = new Uint32Array(64);
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
}
