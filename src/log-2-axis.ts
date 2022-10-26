declare var Chart: any;
var Scale = Chart.Scale, LinearScale = Chart.LinearScale;

/**
 * https://www.chartjs.org/docs/master/samples/advanced/derived-axis-type.html#log2-axis-implementation
 */
export class Log2Axis extends Scale {
    constructor(cfg: any) {
        super(cfg);
        this._startValue = undefined;
        this._valueRange = 0;
    }

    parse(raw: unknown, index: number) {
        const value = LinearScale.prototype.parse.apply(this, [raw, index]);
        return isFinite(value) && value > 0 ? value : null;
    }

    determineDataLimits() {
        const { min, max } = this.getMinMax(true);
        this.min = isFinite(min) ? Math.max(0, min) : null;
        this.max = isFinite(max) ? Math.max(0, max) : null;
    }

    buildTicks() {
        const ticks = [];

        let power = Math.floor(Math.log2(this.min || 1));
        let maxPower = Math.ceil(Math.log2(this.max || 2));
        while (power <= maxPower) {
            ticks.push({ value: Math.pow(2, power) });
            power += 1;
        }

        this.min = ticks[0].value;
        this.max = ticks[ticks.length - 1].value;
        return ticks;
    }

    configure() {
        const start = this.min;

        super.configure();

        this._startValue = Math.log2(start);
        this._valueRange = Math.log2(this.max) - Math.log2(start);
    }

    getPixelForValue(value: number) {
        if (value === undefined || value === 0) {
            value = this.min;
        }

        return this.getPixelForDecimal(value === this.min ? 0
            : (Math.log2(value) - this._startValue) / this._valueRange);
    }

    getValueForPixel(pixel: number) {
        const decimal = this.getDecimalForPixel(pixel);
        return Math.pow(2, this._startValue + decimal * this._valueRange);
    }
}

Log2Axis.id = 'log2';
Log2Axis.defaults = {};
