var Chart: any;//new (a: any, b: any) => any;

interface IBenchmarkResultRow {
    text: string,
    columns: string[]
}

interface IBenchmarkResults {
    categoriesTitle: string
}

enum Theme {
    Dark = 'dark',
    Light = 'light'
}

class ChartBuilder {
    private readonly _chart: any;

    private _benchmarkResultRows: IBenchmarkResultRow[] = [];
    private _theme = Theme.Dark;
    private _yAxeTextColor = '#606060';
    private _xAxeTextColor = '#606060';
    private _gridLineColor = '#0000001a';
    private _creditTextColor = '#00000040';

    public get theme() {
        return this._theme;
    }
    public set theme(value) {
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
    }

    private get chartPlugins() {
        return this._chart.config.options.plugins;
    }

    private get chartScales() {
        return this._chart.config.options.scales;
    }

    constructor(canvas: HTMLCanvasElement) {
        console.log(Chart.defaults.borderColor);
        this.theme = Theme.Dark ;//this.theme;
        this._chart = getChart();
        console.log(this._chart);
        console.log(Chart.defaults.color);
        console.log(this);
        // Chart.defaults.color = 'blue';
        // Chart.defaults.backgroundColor = 'blue';
        Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';
        function getChart() {
            const config = {
                type: 'bar',
                options: {
                    plugins: {
                        subtitle: {
                            display: true,
                            text: 'Chart by chartbenchmark.net',
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
                                display: true,
                                text: 'Microseconds',
                                color1: Chart.defaults.color
                            },
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Category, Other Category'
                            }
                        }
                    }
                }
            };

            return new Chart(canvas.getContext('2d'), config);
        }
    }

    loadBenchmarkResults(text: string) {
        const rows = text
            .split('\n')
            .map(i => i.trim())
            .filter(i => i.length > 2 && i.startsWith('|') && i.endsWith('|'))
            .filter((i, index) => index !== 1)
            .map(i => ({
                text: i,
                columns: i
                    .split('|')
                    .slice(1, -1)
                    .map(i => i.trim())
            }))
            .filter(i => i.columns.some(c => c.length > 0));


        const headerRow = rows[0];
        const methodIndex = headerRow.columns.indexOf('Method');
        const runtimeIndex = headerRow.columns.indexOf('Runtime');
        const meanIndex = headerRow.columns.lastIndexOf('Mean');

        const categoryIndexStart = Math.max(methodIndex, runtimeIndex) + 1;
        const categoryIndexEnd = meanIndex - 1;

        const methods = new Map();

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

        const methodsArray = [...methods]
            .map(i => ({
                name: i[0],
                values: i[1]
            }));

        this.render();

        return {
            categories: getCategories(),
            CategoriesTitle: getCategoriesTitle(),
            methods: methodsArray,
            scale: inferScale()
        };

        function getCategories() {
            const categories = new Set();
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

        function inferScale() {
            for (const method of methods) {
                for (const value of method[1]) {
                    switch (value.scale) {
                        case 'us':
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
        this.chartPlugins.subtitle.color = this._creditTextColor;

        this.chartScales.y.title.text = 'Seconds';
        this.chartScales.y.title.color = this._yAxeTextColor;
        this.chartScales.y.grid.color = this._gridLineColor;

        this.chartScales.x.title.text = 'Category';
        this.chartScales.x.title.color = this._xAxeTextColor;
        this.chartScales.x.grid.color = this._gridLineColor;
        
        this._chart.data.labels = ['64, 1', '512, 1'];
        this._chart.data.datasets = [
            {
                label: 'Int32ValuesXmlAsync',
                data: [1322.7, 4687.0],
                backgroundColor: '#f94144'
            }
        ];


        // this.chart.config.scales = {
        //     y: {
        //         title: {
        //             display: true,
        //             text: 'Seconds'
        //         },
        //     },
        //     x: {
        //         title: {
        //             display: true,
        //             text: 'Category, Other Category'
        //         }
        //     }
        // };

        this._chart.update();
    }
}