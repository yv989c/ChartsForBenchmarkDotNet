var Chart: any;//new (a: any, b: any) => any;

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

class ChartBuilder {
    private readonly _chart: any;
    private readonly _colors = ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590'];

    private _benchmarkResultRows: IBenchmarkResultRow[] = [];
    private _theme = Theme.Dark;
    private _yAxeTextColor = '#606060';
    private _xAxeTextColor = '#606060';
    private _gridLineColor = '';
    private _creditTextColor = '';
    private _useLogarithmicScale = false;

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

    get useLogarithmicScale() {
        return this._useLogarithmicScale;
    }
    set useLogarithmicScale(value) {
        this._useLogarithmicScale = value;
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

        console.log(Chart.defaults.borderColor);
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
        const benchmarkResult = this.getBenchmarkResult();
        if (benchmarkResult === null) {
            return;
        }

        this.chartPlugins.subtitle.color = this._creditTextColor;

        const yAxe = this.chartScales.y;
        yAxe.title.text = benchmarkResult.scale;
        yAxe.title.color = this._yAxeTextColor;
        yAxe.grid.color = this._gridLineColor;
        yAxe.type = this.useLogarithmicScale ? 'logarithmic' : 'linear';

        const xAxe = this.chartScales.x;
        xAxe.title.text = benchmarkResult.categoriesTitle;
        xAxe.title.color = this._xAxeTextColor;
        xAxe.grid.color = this._gridLineColor;

        const chartData = this._chart.data;

        chartData.labels = benchmarkResult.categories;

        const colors = this._colors;
        let colorIndex = 0;

        chartData.datasets = benchmarkResult.methods
            .map(m => ({
                label: m.name,
                data: m.values.map(v => v.value),
                backgroundColor: getNextColor()
            }));

        function getNextColor() {
            if ((colorIndex ^ colors.length) === 0) {
                colorIndex = 0;
            }
            return colors[colorIndex++];
        }
        // this._chart.data.datasets = [
        //     {
        //         label: 'Int32ValuesXmlAsync',
        //         data: [1322.7, 4687.0],
        //         backgroundColor: '#f94144'
        //     }
        // ];

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