let aws_keys = {
    s3: {
        region: 'us-east-2',
        accessKeyId: "AKIATP32HZSCNIB5SV3Q",
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
    }
}
module.exports = aws_keys