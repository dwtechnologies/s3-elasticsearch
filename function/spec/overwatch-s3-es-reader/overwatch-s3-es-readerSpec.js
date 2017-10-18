const zlib = require('zlib');
const fs = require('fs');

describe("overwatch-s3-es", function () {
    var overWatch = require('../../index')

    describe("overwatch-s3-es", function () {

        it("should be able to parse fastly log string to a mapped object", function () {
            var fastlyKeyMessage = '<134>2017-03-01T11:31:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:31:50 +0000] "GET / HTTP/1.1" 304 "-"';
            var faslyKeyFastly = '134';
            var faslyKeyDate = '2017-03-01T11:31:51Z';
            var faslyKeyFastlyCache = 'cache-bma7021';
            var faslyKeyFastly_s3 = 's3[277746]';
            var faslyKeyIp = '151.177.160.30';
            var faslyKeyOne = '-';
            var faslyKeyTwo = '-';
            var faslyKeyAccessdate = '01/Mar/2017:11:31:50 +0000';
            var faslyKeyMethod = 'GET / HTTP/1.1';
            var faslyKeyHttpcode = '304';
            var faslyKeyThree = '-';

            var parsedData = overWatch.parse(fastlyKeyMessage);
            expect(parsedData.message).toEqual(fastlyKeyMessage);
            expect(parsedData.fasly).toEqual(faslyKeyFastly);
            expect(parsedData.date).toEqual(faslyKeyDate);
            expect(parsedData.fastlyCache).toEqual(faslyKeyFastlyCache);
            expect(parsedData.fastlyS3).toEqual(faslyKeyFastly_s3);
            expect(parsedData.ip).toEqual(faslyKeyIp);
            expect(parsedData.one).toEqual(faslyKeyOne);
            expect(parsedData.two).toEqual(faslyKeyTwo);
            expect(parsedData.accessdate).toEqual(faslyKeyAccessdate);
            expect(parsedData.method).toEqual(faslyKeyMethod);
            expect(parsedData.httpcode).toEqual(faslyKeyHttpcode);
            expect(parsedData.three).toEqual(faslyKeyThree);
        });
    });

    describe("overWatch create format logline", function () {
        it("should append data to a string formated for elastic cache bulk parsed", function () {
            var body = "";
            body += overWatch.formatLogLine('<134>2017-03-01T11:31:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:31:50 +0000] "GET / HTTP/1.1" 304 "-"', true)
            body += overWatch.formatLogLine('<134>2016-04-10T11:31:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:31:50 +0000] "GET / HTTP/1.1" 304 "-"', true)
            var bodySplitLine = body.split('\n');
            expect(bodySplitLine[0]).toEqual('{"index":{}}');
            expect(bodySplitLine[1]).toMatch(/2017-03-01T11:31:51Z/);
            expect(bodySplitLine[2]).toEqual('{"index":{}}');
            expect(bodySplitLine[3]).toMatch(/2016-04-10T11:31:51Z/);
        });

        it("should append data to a string formated for elastic cache bulk", function(){
            var logline1 = '{"clientIp":"37.123.161.104","reqServedTimeMs":1004822,"bytesRecv":1175,"bytesSent":21995,"httpMethod":"GET","status":200,"statusCompleted":"+","statusOrigin":200,"timestamp":"[24/Mar/2017:11:44:30 +0000]","host":"red-www.danielwellington.com","countryCode":"SE","uri":"/se/classic-sheffield-lady","queryString:"","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36"}'
            var logline2 = '{"clientIp":"37.123.161.104","reqServedTimeMs":196269,"bytesRecv":1189,"bytesSent":34568,"httpMethod":"GET","status":200,"statusCompleted":"+","statusOrigin":200,"timestamp":"[24/Mar/2017:11:44:31 +0000]","host":"s3-eu-west-1.amazonaws.com","countryCode":"SE","uri":"/staticbucketdwstaging/media/catalog/product/cache/thumbnail/640x/dc4095f997835e64a6e07c1125933e12/c/l/cl36rg04_trimmed_4.jpg","queryString:"","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36"}'
            var body = "";
            body += overWatch.formatLogLine(logline1, false);
            body += overWatch.formatLogLine(logline2, false);
            var bodySplitLine = body.split('\n');
            expect(bodySplitLine[0]).toEqual('{"index":{}}');
            expect(bodySplitLine[1]).toEqual(logline1);
            expect(bodySplitLine[2]).toEqual('{"index":{}}');
            expect(bodySplitLine[3]).toEqual(logline2);
        });

    });

    

    describe("from file stream", function () {

         var logs = `<134>2017-03-01T11:31:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:31:51 +0000] "GET / HTTP/1.1" 304 "-"
<134>2016-04-10T11:31:55Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:31:55 +0000] "GET / HTTP/1.1" 304 "-"
<134>2016-04-10T11:32:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:32:50 +0000] "GET / HTTP/1.1" 304 "-"
<134>2016-04-10T11:33:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:33:50 +0000] "GET / HTTP/1.1" 304 "-"
<134>2016-05-10T11:34:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:34:50 +0000] "GET / HTTP/1.1" 304 "-"
<134>2016-05-10T11:35:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:35:50 +0000] "GET / HTTP/1.1" 304 "-"
<134>2016-05-10T11:36:51Z cache-bma7021 s3[277746]: 151.177.160.30 "-" "-" [01/Mar/2017:11:36:50 +0000] "GET / HTTP/1.1" 304 "-"`;

        beforeEach(function (done) {
            //Prep logfile
            var fs = require('fs');
            var zipstream = zlib.createGzip()
            var writeStream = fs.createWriteStream("access.log.gz");
           
            zipstream.pipe(writeStream);
            zipstream.write(logs);
            zipstream.end('');
            zipstream.on('finish', function () {
                done();
            });
        });

        it("should split the file into chunks by line and convert to ElasticSearch batch format", function (done) {
            
            const byline = require('byline');
            const gunzip = zlib.createGunzip();
            const readStream = fs.createReadStream('access.log.gz');
            var unzipped = byline(readStream.pipe(gunzip));
            
            //BatchSize
            const batchSize = 4;
            //Number of batch. Needed to get the lines from test file
            var startLineNumber = 0;
             //Lambdacallback
            var lambdacallback = function(){};
            
            var callback = function(stream, streamFinished, batch, lambdacallback){
	            if (streamFinished) {
                    var batchSplit = batch.split('\n');
                    var logsSplit = logs.split('\n');
                    //Check the remainder of the batch to be correct.
                    expect(logsSplit.length % batchSize).toEqual((batchSplit.length - 1 ) / 2);
                   
                    //Get line in logs and format it to a ES bulkmessage
                    var logLine = overWatch.formatLogLine(logsSplit[logsSplit.length-1], true);
   
                    //Check last batch entry
                    expect(logLine).toEqual(batchSplit[batchSplit.length-3] + '\n' + batchSplit[batchSplit.length-2] + '\n');
                    done();                    
                } else {
                    //Get line in logs and format it to a ES bulkmessage
                    var logLine = overWatch.formatLogLine(logs.split('\n')[startLineNumber], true);                    
                    //Split batch by new line
                    var batchSplit = batch.split('\n');                    
                    //Check first line in batch. Should equal the correct in logs depending on the batch size
                    expect(logLine).toEqual(batchSplit[0] + '\n' + batchSplit[1] + '\n');
                    //Check batchsize to match given number. Format fuction adds an extra linebreak in the end.
                    expect(batchSize * 2 + 1).toEqual(batchSplit.length);
                    
                    startLineNumber = startLineNumber+batchSize;
                    stream.resume();
                } 
            }

            //Lambdacallback
            var lambdacallback = function(){};

            overWatch.getFileLinesBatch(unzipped, batchSize, lambdacallback, callback, true);

        });
    });

    
    // describe("main function test", function () {
    //     it("should just work", function (done) {
    //         var event = {"patrik": "ok"};
    //         var context = {};
    //         var callback = function(error, result){
    //             if(error){
    //                 console.log("LAMBDA ERROR\nERROR:\n");
    //                 console.log(error);
    //                 done()
    //             } else {
    //                 console.log("LAMBDA SUCCESS\nResult:\n");
    //                 console.log(result);
    //                 done()
    //             }

    //         }
    //         overWatch.handler(event, context, callback);
    //     });
    // });
});
