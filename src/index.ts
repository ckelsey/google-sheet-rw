const loadJSONP = (function () {
    let unique = 0

    return function (url: string, callback: Function) {
        // INIT
        let name = "_jsonp_" + unique++

        if (url.match(/\?/)) {
            url += "&callback=" + name
        } else {
            url += "?callback=" + name
        }

        // Create script
        const script = document.createElement('script')
        script.type = 'text/javascript'
        script.src = url;

        // Setup handler
        (<any>window)[name] = function (data: any) {
            callback.call((<any>window), data)

            document.getElementsByTagName('head')[0].removeChild(script)
            delete (<any>window)[name];
        };

        // Load JSON
        document.getElementsByTagName('head')[0].appendChild(script)
    };
})()

class GoogleSheetsRW {
    worksheets: Worksheets = {}

    parseWorksheet(xml: string): Promise<WorksheetData> {
        return new Promise((resolve, reject) => {
            const parser = new DOMParser()
            let entries: NodeList = document.querySelectorAll(`asdfg`)
            let results: WorksheetData
            let lastUpdated: Date = new Date()
            let title: string = ``

            try {
                const xmlDoc = parser.parseFromString(xml, "text/xml")
                entries = xmlDoc.querySelectorAll('entry')

                let titleElement = xmlDoc.querySelector('title')
                let lastUpdatedElement = xmlDoc.querySelector('updated')

                if (titleElement) {
                    title = titleElement.textContent || ``
                }

                if (lastUpdatedElement) {
                    let dateString = lastUpdatedElement.textContent || new Date()
                    lastUpdated = new Date(dateString)
                }

            } catch (e) {
                reject(e)
            }

            results = {
                title: title,
                lastUpdated: lastUpdated,
                entries: {}
            }

            for (let i = 0; i < entries.length; i = i + 1) {
                let temp: WorksheetValue = {
                    google_url: ``,
                    id: ``
                }

                let children = entries[i].childNodes

                for (let c = 0; c < children.length; c = c + 1) {
                    let child = children[c] as HTMLElement
                    if (child) {
                        if (child.tagName.toLowerCase().indexOf('gsx:') > -1) {
                            temp[child.tagName.split('gsx:')[1]] = children[c].textContent
                        } else if (child.tagName.toLowerCase() === 'id') {
                            temp.google_url = child.textContent || ``
                            temp.id = temp.google_url.split('/')[temp.google_url.split('/').length - 1]
                        }
                    }
                }

                if (Object.keys(temp).length) {
                    results.entries[i] = temp
                }
            }

            return resolve(results)
        })
    }

    parseFeed(feed: string): Promise<{ [key: string]: WorksheetEntry }> {
        return new Promise((resolve, reject) => {
            const parser = new DOMParser()
            let entries: NodeList = document.querySelectorAll(`asdfg`)
            let results: { [key: string]: WorksheetEntry } = {}

            try {
                let xmlDoc = parser.parseFromString(feed, "text/xml")
                entries = xmlDoc.querySelectorAll('entry')
            } catch (e) {
                reject(e)
            }

            if (!entries || !entries.length) {
                return reject(`invalid xml in worksheet`)
            }

            for (let i = 0; i < entries.length; i = i + 1) {
                let temp: WorksheetEntry = {
                    id: ``,
                    title: ``
                }

                let children = entries[i].childNodes

                for (let c = 0; c < children.length; c = c + 1) {
                    if (children[c]) {
                        let child = children[c] as HTMLElement

                        if (child.tagName.toLowerCase() === 'id') {
                            let text = child.textContent

                            if (text && text.split) {
                                text = text.split('/')[text.split('/').length - 1]
                                temp.id = text
                            }
                        }

                        if (child.tagName.toLowerCase() === 'title') {
                            temp.title = child.textContent || ``
                        }
                    }
                }

                if (temp.id && temp.id !== ``) {
                    results[temp.id] = temp
                }
            }

            return resolve(results)
        })
    }

    init(config: ConfigObject): Promise<Worksheet> {

        return new Promise((resolve, reject) => {
            if (!config.sheet) {
                return reject(`No sheet id in config`)
            }

            if (!config.script) {
                return reject(`No script id in config`)
            }

            if (!config.domain) {
                return reject(`No domain in config`)
            }

            let url = 'https://spreadsheets.google.com/feeds/worksheets/' + config.sheet + '/public/values'

            return loadJSONP(url, (res: string) => {

                if (!res) {
                    return reject(`invalid worksheet`)
                }

                this.parseFeed(res)
                    .then(_feedData => {
                        let feedData: Worksheet = {
                            sheetId: config.sheet,
                            script: config.script,
                            domain: config.domain,
                            sheets: JSON.parse(JSON.stringify(_feedData))
                        }

                        this.worksheets[config.sheet] = feedData

                        resolve(feedData)
                    })
                    .catch(error => {
                        console.log(error)
                    })
            })
        })
    }

    readSheet(worksheet: Worksheet, sheet: WorksheetEntry): Promise<WorksheetData> {
        return new Promise((resolve, reject) => {
            let url = 'https://spreadsheets.google.com/feeds/list/' + worksheet.sheetId + '/' + sheet.id + '/public/values'

            return loadJSONP(url, (res: string) => {

                if (!res) {
                    return reject(`invalid worksheet`)
                }

                this.parseWorksheet(res)
                    .then(worksheetData => {
                        this.worksheets[worksheet.sheetId].sheets[sheet.id].data = worksheetData
                        resolve(worksheetData)
                    })
                    .catch(error => {
                        reject(error)
                    })
            })
        })
    }

    createEntries(dataToSend: Array<any>, worksheet: Worksheet, sheet: WorksheetEntry) {
        return new Promise((resolve, reject) => {
            if (!Array.isArray(dataToSend)) {
                dataToSend = [dataToSend]
            }

            for (let e = 0; e < dataToSend.length; e++) {
                let hex = '';
                for (let i = 0; i < JSON.stringify(dataToSend[e]).length; i++) {
                    hex += '' + JSON.stringify(dataToSend[e]).charCodeAt(i).toString(16);
                }

                for (let p in dataToSend[e]) {
                    if ((!!dataToSend[e][p]) && (dataToSend[e][p].constructor === Array || dataToSend[e][p].constructor === Object)) {
                        try {
                            dataToSend[e][p] = JSON.stringify(dataToSend[e][p]);
                        } catch (error) { }
                    }
                }

                dataToSend[e].confirmationID = (new Date().getTime()) + '_' + hex
                dataToSend[e].created = new Date()
            }

            let postUrl = `https://script.google.com/a/macros/${worksheet.domain}/s/${worksheet.script}/dev?sheetId=${worksheet.sheetId}&sheet=${encodeURIComponent(sheet.title)}&data=${encodeURIComponent(JSON.stringify(dataToSend))}`

            loadJSONP(postUrl, (res: string) => {
                console.log(res)
                return this.readSheet(worksheet, sheet)
                    .then(res => {
                        console.log(res)

                        // let addedRows = []

                        // for (let r in res.entries) {
                        //     dataToSend.forEach(function (sentData, index) {
                        //         if (res.entries[r].confirmationid === sentData.confirmationID) {
                        //             addedRows.push({ index: parseInt(r) + 2, row: res.entries[r] })
                        //         }
                        //     })
                        // }

                        // res.addedRows = addedRows

                        // if (addedRows.length !== dataToSend.length) {
                        //     return reject(res);
                        // }

                        return resolve(res)
                    })
                    .catch(res => {
                        return reject(res)
                    })
            })
        })
    }

    updateEntry() {

    }
}

(<any>window).GoogleSheetsRW = new GoogleSheetsRW()

export default (<any>window).GoogleSheetsRW