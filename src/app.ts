import { Legend, SubTitle, Tooltip, LinearScale, LogarithmicScale, BarController, BarElement, CategoryScale, Chart } from "chart.js";
import { Log2Axis } from "./log-2-axis";
import { ChartBuilder, Theme, ScaleType, DisplayMode } from "./chart-builder";
import LZString from "lz-string";

interface ISharedData {
    v?: number,
    settings: {
        display: string,
        scale: string,
        theme: string
    },
    results: string
}

export class App {
    private static readonly DefaultFileName = 'chart.png';

    _chartWrapper: HTMLElement;
    _chartCanvas: HTMLCanvasElement;
    _builder: ChartBuilder;
    _resultsInput: HTMLInputElement;
    _displayRadioContainer: HTMLElement;
    _scaleRadioContainer: HTMLElement;
    _themeRadioContainer: HTMLElement;

    constructor() {
        Chart.register(Legend, SubTitle, Tooltip, LinearScale, LogarithmicScale, CategoryScale, BarController, BarElement, Log2Axis);
        Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

        this._chartWrapper = document.getElementById('chartWrapper')!;
        this._chartCanvas = document.getElementById('chartCanvas') as HTMLCanvasElement;
        this._builder = new ChartBuilder(this._chartCanvas);

        this._resultsInput = document.getElementById('resultsInput') as HTMLInputElement;
        this._displayRadioContainer = document.getElementById('displayRadioContainer') as HTMLElement;
        this._scaleRadioContainer = document.getElementById('scaleRadioContainer') as HTMLElement;
        this._themeRadioContainer = document.getElementById('themeRadioContainer') as HTMLElement;

        this.bindSizeControls(this._chartWrapper);

        this._scaleRadioContainer.addEventListener('input', e => {
            this._builder.scaleType = (e.target as HTMLInputElement).value as ScaleType;
        });

        this._displayRadioContainer.addEventListener('input', e => {
            this._builder.displayMode = (e.target as HTMLInputElement).value as DisplayMode;
        });

        this._themeRadioContainer.addEventListener('input', e => {
            this._builder.theme = (e.target as HTMLInputElement).value as Theme;
            this.refreshChartContainer();
        });

        document.getElementById('copyToClipboardButton')!.addEventListener('click', () => {
            chartCanvas.toBlob(blob => {
                const item = new ClipboardItem({ 'image/png': blob! });
                navigator.clipboard.write([item]);
            });
        });

        document.getElementById('downloadButton')!.addEventListener('click', () => {
            var link = document.createElement('a');
            link.download = App.DefaultFileName;
            link.href = this._chartCanvas.toDataURL();
            link.click();
        });

        document.getElementById('shareButtonContainer')!.addEventListener('click', async (event) => {
            event.preventDefault();

            const target = event.target as HTMLAnchorElement;
            switch (target.dataset.action) {
                case 'shareAsUrl':
                    await this.shareAsUrl();
                    break;
                case 'shareAsImage':
                    await this.shareAsImage();
                    break;
            }
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

        this.bindResultsInput(this._builder);
    }

    private bindResultsInput(builder: ChartBuilder) {
        const resultsInput = this._resultsInput;

        resultsInput.addEventListener('input', () => {
            loadBenchmarkResult();
        });

        if (this.tryRestoreFromSharedUrl()) {
            loadBenchmarkResult();
            return;
        }

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

    private refreshChartContainer() {
        switch (this._builder.theme) {
            case Theme.Dark:
                this._chartWrapper.classList.remove('bg-light');
                break;
            case Theme.Light:
                this._chartWrapper.classList.add('bg-light');
                break;
        }
    }

    private getValue(container: HTMLElement) {
        return (<HTMLInputElement>container.querySelector('input:checked')).value;
    }

    private setValue(container: HTMLElement, value: string) {
        return (<HTMLInputElement>container.querySelector(`input[value="${value}"]`)).checked = true;
    }

    private async share(data: any) {
        const canShare =
            typeof (navigator.canShare) === 'function' &&
            navigator.canShare(data);

        if (canShare) {
            try {
                await navigator.share(data);
                return true;
            } catch (error) {
                if (error instanceof Error && error.name === 'AbortError') {
                    return true;
                }
            }
        }

        return false;
    }

    private showUnsupportedMessage() {
        alert('This feature is not supported by your browser. 😞');
    }

    private async shareAsUrl() {
        const data: ISharedData = {
            v: 1,
            settings: {
                display: this.getValue(this._displayRadioContainer),
                scale: this.getValue(this._scaleRadioContainer),
                theme: this.getValue(this._themeRadioContainer)
            },
            results: LZString.compressToBase64(this._resultsInput.value)
        };

        const serializedData = encodeURIComponent(JSON.stringify(data));
        const url = `${window.location.origin}#shared=${serializedData}`;

        try {
            if (!await this.share({ url: url })) {
            await navigator.clipboard.writeText(url);
            alert('A shareable URL was copied to your clipboard!')
            }
        } catch (error) {
            console.error(error);
            prompt('Copy the following URL for sharing:', url);
        }
    }

    private async shareAsImage() {
        this._chartCanvas.toBlob(async blob => {
            try {
                const file = new File([<any>blob], App.DefaultFileName, { type: 'image/png' });
                const data = { files: [file] };
                if (!await this.share(data)) {
                    this.showUnsupportedMessage();
                }
            } catch (error) {
                console.error(error);
                this.showUnsupportedMessage();
            }
        });
    }

    private tryRestoreFromSharedUrl() {
        try {
            if (window.location.hash.length < 2) {
                return;
            }

            const urlParams = new URLSearchParams(window.location.hash.substring(1));
            const sharedEncodedData = urlParams.get('shared');

            if (sharedEncodedData) {
                const sharedData = <ISharedData>JSON.parse(sharedEncodedData);

                this._resultsInput.value = sharedData.v === 1 ? LZString.decompressFromBase64(sharedData.results) : sharedData.results;
                this.setValue(this._displayRadioContainer, sharedData.settings.display);
                this.setValue(this._scaleRadioContainer, sharedData.settings.scale);
                this.setValue(this._themeRadioContainer, sharedData.settings.theme);

                this._builder.displayMode = <DisplayMode>this.getValue(this._displayRadioContainer);
                this._builder.scaleType = <ScaleType>this.getValue(this._scaleRadioContainer);
                this._builder.theme = <Theme>this.getValue(this._themeRadioContainer);
                this.refreshChartContainer();

                return true;
            }
        } catch (error) {
            console.error(error);
            alert('Error while restoring the data from the URL.');
        }

        return false;
    }
}

