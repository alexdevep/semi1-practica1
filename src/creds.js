let aws_keys = {
    s3: {
        region: 'us-east-2',
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey",
        //apiVersion: '2006-03-01',
    },
    dynamodb: {
        apiVersion: '2012-08-10',
        region: 'us-east-2',
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey"
    },
    rekognition: {
        region: 'us-east-2',
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey" 
    },
    translate: {
        region: 'us-east-2',
        accessKeyId: "accessKeyId",
        secretAccessKey: "secretAccessKey" 
    }
}
module.exports = aws_keys
