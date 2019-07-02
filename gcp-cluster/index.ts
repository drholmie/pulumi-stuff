import * as pulumi from "@pulumi/pulumi";
import * as gcp from "@pulumi/gcp";
import * as k8s from "@pulumi/kubernetes";
const env = pulumi.getStack();
const name=process.env.CLUSTER_NAME || "default-dev";
const net = new pulumi.StackReference(`/gcp-network/${env}`);
const primary = new gcp.container.Cluster(name, {
    initialNodeCount: 1,
    nodeVersion: process.env.VERSION,
    minMasterVersion: process.env.VERSION,
    location: process.env.ZONE,
    // Setting an empty username and password explicitly disables basic auth
    masterAuth: {
        clientCertificateConfig:{
            issueClientCertificate:false
        },
        password: "",
        username: "",
    },
    loggingService: 'none',
    network: process.env.NETWORK,
    monitoringService: 'none',
    enableLegacyAbac: false,
    enableKubernetesAlpha: true,
    podSecurityPolicyConfig:{
        enabled:true
    },
    verticalPodAutoscaling:{
        enabled:true
    },
    networkPolicy:{
        enabled: true
    },
    ipAllocationPolicy:{
        useIpAliases: false
    },
    addonsConfig:{
        horizontalPodAutoscaling: {
            disabled:false
        },
        httpLoadBalancing:{
            disabled:false
        },
        kubernetesDashboard:{
            disabled:false
        },
        networkPolicyConfig:{
            disabled:false
        }

    },
    // We can't create a cluster with no node pool defined, but we want to only use
    // separately managed node pools. So we create the smallest possible default
    // node pool and immediately delete it.
    removeDefaultNodePool: true,
});
const primaryPreemptibleNodes = new gcp.container.NodePool(name+"-preemtible", {
    cluster: primary.name,
    location: process.env.ZONE,
    nodeConfig: {
        machineType: process.env.MACHINE_TYPE ,
        imageType: "COS",
        diskSizeGb: parseInt(process.env.DISK_SIZE || "15"),
        minCpuPlatform:"Intel Skylake",
        
        diskType: "pd-standard",
        metadata: {
            "disable-legacy-endpoints": "true",
        },
        
        oauthScopes: [
            "https://www.googleapis.com/auth/devstorage.read_only",
            "https://www.googleapis.com/auth/service.management.readonly",
            "https://www.googleapis.com/auth/servicecontrol",
            "https://www.googleapis.com/auth/logging.write",
            "https://www.googleapis.com/auth/monitoring",
        ],
        preemptible: true,
    },
    management:{
        autoRepair: false,
        autoUpgrade: false
    },
    nodeCount: 1,
    autoscaling:{
        minNodeCount:1,
        maxNodeCount: parseInt(process.env.MAX_NODES || "5"),
    },

});