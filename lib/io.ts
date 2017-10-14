// stdin reading.

export class StdinBuf{
    private bufs: Array<Buffer>;
    private arridx: number;
    private bufidx: number;
    private ended: boolean;
    private callback: (()=>void) | null;
    constructor(){
        this.bufs = [];
        this.arridx = 0;
        this.bufidx = 0;
        this.ended = false;
        this.callback = null;
        this.init();
    }
    private init(): void{
        const {
            stdin,
        } = process;

        stdin.on('readable', ()=>{
            const buf = stdin.read() as Buffer | null;
            if (buf != null){
                this.bufs.push(buf);
                if (this.callback != null){
                    this.callback();
                    this.callback = null;
                }
            }
        });
        stdin.on('end', ()=>{
            this.ended = true;
        });
    }
    /**
     * Read a byte from stdin.
     */
    readByte(): number | null {
        const len = this.bufs.length;
        // console.error('arridx', this.arridx, 'len', len, 'bufidx', this.bufidx);
        while (this.arridx < len){
            const buf = this.bufs[this.arridx];
            if (this.bufidx < buf.length){
                const val = buf[this.bufidx];
                this.bufidx++;
                return val;
            } else {
                // go to next buf
                this.arridx++;
                this.bufidx = 0;
            }
        }
        // not readable yet
        return null;
    }
    /**
     * Wait for a byte.
     */
    wait(): Promise<void>{
        return new Promise((fulfill, reject)=>{
            if (this.bufidx < this.bufs.length){
                // あれ、ある
                throw new Error('not waiting');

                // fulfill();
            } else {
                this.callback = fulfill;
            }
        });
    }
}
