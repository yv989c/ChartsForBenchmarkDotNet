var Chart: any, Scale = Chart.Scale, LinearScale = Chart.LinearScale;

interface IBenchmarkResultRow {
    text: string,
    columns: string[]
}

interface IMethodValue {
    category: string,
    value: number,
    scale: string
}

enum Theme {
    Dark = 'dark',
    Light = 'light'
}

enum ScaleType {
    Linear = 'linear',
    Log10 = 'log10',
    Log2 = 'log2'
}

/**
 * https://www.chartjs.org/docs/master/samples/advanced/derived-axis-type.html#log2-axis-implementation
 */
class Log2Axis extends Scale {
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
Chart.register(Log2Axis);

class ChartBuilder {
    private readonly _chart: any;
    /*
    https://coolors.co/palette/f94144-f3722c-f8961e-f9c74f-90be6d-43aa8b-4d908e-577590
    https://coolors.co/palette/ff595e-ff924c-ffca3a-c5ca30-8ac926-36949d-1982c4-4267ac-565aa0-6a4c93
    https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-babb74-e9c46a-efb366-f4a261-ee8959-e76f51
    https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-e9c46a-f4a261-ee8959-e76f51
    */
    private readonly _colors = ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590'];

    private _benchmarkResultRows: IBenchmarkResultRow[] = [];
    private _theme = Theme.Dark;
    private _yAxeTextColor = '#606060';
    private _xAxeTextColor = '#606060';
    private _gridLineColor = '';
    private _creditTextColor = '';
    private _scaleType = ScaleType.Linear;

    get theme() {
        return this._theme;
    }
    set theme(value) {
        switch (value) {
            case Theme.Dark:
                this._creditTextColor = '#66666675';
                this._gridLineColor = '#66666638';
                break;
            case Theme.Light:
                this._creditTextColor = '#00000040';
                this._gridLineColor = '#0000001a';
                break;
            default:
                break;
        }
        this._theme = value;
        this.render();
    }

    get scaleType() {
        return this._scaleType;
    }
    set scaleType(value) {
        this._scaleType = value;
        this.render();
    }

    private get chartPlugins() {
        return this._chart.config.options.plugins;
    }

    private get chartScales() {
        return this._chart.config.options.scales;
    }

    constructor(canvas: HTMLCanvasElement) {
        this._chart = getChart();
        this.theme = this.theme;

        function getChart() {
            const config = {
                type: 'bar',
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        subtitle: {
                            display: true,
                            text: 'Made with chartbenchmark.net',
                            position: 'right',
                            align: 'center',
                            fullSize: false,
                            font: {
                                size: 10,
                                family: 'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace'
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true
                            }
                        },
                        x: {
                            title: {
                                display: true
                            }
                        }
                    }
                }
            };

            return new Chart(canvas.getContext('2d'), config);
        }
    }

    loadBenchmarkResult(text: string) {
        this._benchmarkResultRows = text
            .split('\n')
            .map(i => i.trim())
            .filter(i => i.length > 2 && i.startsWith('|') && i.endsWith('|'))
            .filter((i, index) => index !== 1)
            .map(i => ({
                text: i,
                columns: i
                    .split('|')
                    .slice(1, -1)
                    .map(i => i.replace(/\*/g, '').trim())
            }))
            .filter(i => i.columns.some(c => c.length > 0));

        this.render();
    }

    private getBenchmarkResult() {
        const rows = this._benchmarkResultRows;

        if (rows.length === 0) {
            return null;
        }

        const headerRow = rows[0];
        const methodIndex = headerRow.columns.indexOf('Method');
        const runtimeIndex = headerRow.columns.indexOf('Runtime');
        const meanIndex = headerRow.columns.lastIndexOf('Mean');

        const categoryIndexStart = Math.max(methodIndex, runtimeIndex) + 1;
        const categoryIndexEnd = meanIndex - 1;

        const methods = new Map<string, IMethodValue[]>();

        for (const row of rows) {
            if (row === headerRow) {
                continue;
            }

            let category = '';

            for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                const separator = category.length > 0 ? ', ' : '';
                category += `${separator}${row.columns[i]}`;
            }

            const methodName = row.columns[methodIndex];
            let methodValues = methods.get(methodName);

            if (typeof (methodValues) === 'undefined') {
                methodValues = [];
                methods.set(methodName, methodValues);
            }

            const valueAndScale = getValueAndScale(row.columns[meanIndex]);

            methodValues.push({
                category: category,
                value: valueAndScale.value,
                scale: valueAndScale.scale
            });
        }

        return {
            categories: getCategories(),
            categoriesTitle: getCategoriesTitle(),
            methods: getMethods(),
            scale: inferScale()
        };

        function getCategories() {
            const categories = new Set<string>();
            for (const method of methods) {
                for (const value of method[1]) {
                    categories.add(value.category);
                }
            }
            return [...categories];
        }

        function getCategoriesTitle() {
            let title = '';
            for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                const separator = title.length > 0 ? ', ' : '';
                title += `${separator}${headerRow.columns[i]}`;
            }
            return title;
        }

        function getMethods() {
            return [...methods]
                .map(i => ({
                    name: i[0],
                    values: i[1]
                }));
        }

        function inferScale() {
            for (const method of methods) {
                for (const value of method[1]) {
                    switch (value.scale) {
                        case 'us':
                        case 'μs':
                            return 'Microseconds';
                        case 'ms':
                            return 'Milliseconds';
                        case 's':
                            return 'Seconds';
                        default:
                            return value.scale;
                    }
                }
            }
        }

        function getValueAndScale(formattedNumber: string) {
            const scaleSeparatorIndex = formattedNumber.indexOf(' ');
            const scale = scaleSeparatorIndex >= 0 ? formattedNumber.substring(scaleSeparatorIndex).trim() : '';
            const value = parseFloat(formattedNumber.replace(/[^0-9.]/g, ''));
            return {
                value,
                scale
            }
        }
    }

    private render() {
        const yAxe = this.chartScales.y;
        const xAxe = this.chartScales.x;
        const chartData = this._chart.data;
        const benchmarkResult = this.getBenchmarkResult();

        if (benchmarkResult === null) {
            yAxe.title.text = '';
            xAxe.title.text = '';
            chartData.labels = [];
            chartData.datasets = [];
            this._chart.update();
            return;
        }

        this.chartPlugins.subtitle.color = this._creditTextColor;

        yAxe.title.text = benchmarkResult.scale;
        yAxe.title.color = this._yAxeTextColor;
        yAxe.grid.color = this._gridLineColor;

        switch (this.scaleType) {
            case ScaleType.Log10:
                yAxe.type = 'logarithmic';
                break;
            case ScaleType.Log2:
                yAxe.type = 'log2';
                break;
            default:
                yAxe.type = 'linear';
                break;
        }

        xAxe.title.text = benchmarkResult.categoriesTitle;
        xAxe.title.color = this._xAxeTextColor;
        xAxe.grid.color = this._gridLineColor;

        chartData.labels = benchmarkResult.categories;

        const indexByCategory = new Map<string, number>();
        for (let index = 0; index < benchmarkResult.categories.length; index++) {
            indexByCategory.set(benchmarkResult.categories[index], index);
        }

        const colors = this._colors;
        let colorIndex = 0;

        chartData.datasets = benchmarkResult.methods
            .map(m => ({
                label: m.name,
                data: getData(m.values),
                backgroundColor: getNextColor()
            }));

        function getData(values: IMethodValue[]) {
            const data: number[] = new Array(indexByCategory.size);
            for (const value of values) {
                const index = indexByCategory.get(value.category);
                if (index !== undefined) {
                    data[index] = value.value;
                }
            }
            return data;
        }

        function getNextColor() {
            if ((colorIndex ^ colors.length) === 0) {
                colorIndex = 0;
            }
            return colors[colorIndex++];
        }

        this._chart.update();
    }
}

class App {
    constructor() {
        Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

        const chartWrapper = document.getElementById('chartWrapper')!;
        const chartCanvas = document.getElementById('chartCanvas') as HTMLCanvasElement;
        const builder = new ChartBuilder(chartCanvas);

        this.bindResultsInput(builder);
        this.bindSizeControls(chartWrapper);

        document.getElementById('themeRadioContainer')!.addEventListener('input', e => {
            builder.theme = (e.target as HTMLInputElement).value as Theme;
            switch (builder.theme) {
                case Theme.Dark:
                    chartWrapper.classList.remove('bg-light');
                    break;
                case Theme.Light:
                    chartWrapper.classList.add('bg-light');
                    break;
            }
        });

        document.getElementById('scaleRadioContainer')!.addEventListener('input', e => {
            builder.scaleType = (e.target as HTMLInputElement).value as ScaleType;
        });

        document.getElementById('copyToClipboardButton')!.addEventListener('click', e => {
            chartCanvas.toBlob(blob => {
                const item = new ClipboardItem({ 'image/png': blob! });
                navigator.clipboard.write([item]);
            });
        });

        document.getElementById('downloadButton')!.addEventListener('click', e => {
            var link = document.createElement('a');
            link.download = 'chart.png';
            link.href = chartCanvas.toDataURL();
            link.click();
        });

        document.addEventListener('readystatechange', () => {
            if (document.readyState === 'complete') {
                // Fixes MBC Widget Google Pay bug.
                const widgetIFrame = document.querySelector('iframe[title*="Buy Me a Coffee"]');
                if (widgetIFrame !== null) {
                    widgetIFrame.setAttribute('allow', 'payment');
                }
            }
        });
    }

    private bindResultsInput(builder: ChartBuilder) {
        const resultsInput = document.getElementById('resultsInput') as HTMLInputElement;

        resultsInput.addEventListener('input', () => {
            loadBenchmarkResult();
        });

        resultsInput.addEventListener('click', () => {
            resultsInput.value = '';
            loadBenchmarkResult();
        }, { once: true });

        loadBenchmarkResult();

        function loadBenchmarkResult() {
            builder.loadBenchmarkResult(resultsInput.value);
        }
    }

    private bindSizeControls(chartWrapper: HTMLElement) {
        const widthRangeInput = document.getElementById('widthRangeInput') as HTMLInputElement;
        const heightRangeInput = document.getElementById('heightRangeInput') as HTMLInputElement;

        if (document.body.clientWidth < 992) {
            widthRangeInput.value = '1';
        }

        updateWidth();
        updateHeight();

        widthRangeInput.addEventListener('input', updateWidth);
        heightRangeInput.addEventListener('input', updateHeight);

        function updateWidth() {
            const value = `${parseFloat(widthRangeInput.value) * 100}%`;
            widthRangeInput.title = value;
            chartWrapper.style.width = value;
        }

        function updateHeight() {
            const value = parseFloat(heightRangeInput.value);
            heightRangeInput.title = `${value * 100}%`;
            chartWrapper.style.height = `${value * 1600}px`;
        }
    }
}

new App();
