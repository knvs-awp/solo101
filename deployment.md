# deployment

## backend server

The backend server was created through the AWS Console in the `knvs-awp` project account.

| setting | value |
| --- | --- |
| region | US East (Ohio), `us-east-2` |
| instance name | `solo101-backend` |
| operating system | Amazon Linux 2023, x86_64 |
| instance type | `t3.micro` |
| security group | `solo101-backend-sg` |
| IAM role | `solo101-ec2-role` |
| management access | AWS Systems Manager Session Manager |

The IAM role uses EC2 as its trusted service and includes the
`AmazonSSMManagedInstanceCore` policy. Attach it through **Advanced details → IAM
instance profile** when launching the server.

Session Manager uses an agent on the server and IAM permissions to provide
terminal access. It does not require an SSH key pair or an inbound port 22 rule.
The server needs outbound HTTPS access to the Systems Manager endpoints.

## browser access

1. Open **EC2 → Instances** in the project account and Ohio region.
2. Select `solo101-backend` and choose **Connect**.
3. Under **In web browser**, select **SSM Session Manager** and choose **Connect**.

The instance passed all three status checks and browser terminal access was
verified. This checkpoint covers server creation and management access.

AWS references: [instance launch settings](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-launch-parameters.html),
[Session Manager setup](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-getting-started.html).
