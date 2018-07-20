'use strict'
const path = require('path')
const env = process.env.NODE_ENV || 'production'

module.exports = {
    mode: 'production',
    context: path.resolve(__dirname),
    entry: {
        app: './src/index.ts'
    },
    output: {
        filename: 'google-sheets-rw.min.js',
        path: path.resolve(__dirname, 'dist'),
        libraryTarget: 'umd',
        library: 'google-sheets-rw',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['*', '.ts', '.js', '.json']
    },
    optimization: {
        minimize: env === 'production'
    },
    plugins: [],
    module: {
        rules: [
           
            {
                test: /\.js$/,
                loader: 'babel-loader',
                include: [path.resolve(__dirname, 'src')]
            },
            {
                test: /\.ts$/,
                exclude: /node_modules|vue\/src/,
                loader: "babel-loader!ts-loader"
            }
        ]
    }
}