let aws_keys = {
    s3: {
        region: 'us-east-2',
        accessKeyId: "AKIAUFAWXK2WZQZGC3KH",
        secretAccessKey: "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",
        //apiVersion: '2006-03-01',
    },
    dynamodb: {
        apiVersion: '2012-08-10',
        region: 'us-east-2',
        accessKeyId: "AKIAUFAWXK2W6B3NR254",
        secretAccessKey: "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"
    },
    rekognition: {
        region: 'us-east-2',
        accessKeyId: "AKIAUFAWXK2WWLCNXOP2",
        secretAccessKey: "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" 
    },
    translate: {
        region: 'us-east-2',
        accessKeyId: "AKIAUFAWXK2WZCJ7ZS6R",
        secretAccessKey: "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" 
    }
}
module.exports = aws_keys