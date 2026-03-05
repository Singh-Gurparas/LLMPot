const { publishEvent } = require('../logging/attackLogger');

module.exports = async (req, res) => {
    let resData = {
        name: "node-1",
        cluster_name: "docker-cluster",
        cluster_uuid: "x_abc123",
        version: {
            number: "7.10.2",
            build_flavor: "default",
            build_type: "docker",
            build_hash: "747e1cc71def077253878a59143c1f785afa92b9",
            build_date: "2021-01-13T00:42:12.435326Z",
            build_snapshot: false,
            lucene_version: "8.7.0",
            minimum_wire_compatibility_version: "6.8.0",
            minimum_index_compatibility_version: "6.0.0-beta1"
        },
        tagline: "You Know, for Search"
    };

    let status = 200;

    // Simulate basic Elastic queries
    if (req.originalUrl.includes('_search') || req.originalUrl.includes('_cat/indices')) {
        resData = {
            error: {
                root_cause: [{ type: "index_not_found_exception", reason: "no such index []", resource_type: "index_or_alias", resource_id: "", index_uuid: "_na_", index: "" }],
                type: "index_not_found_exception",
                reason: "no such index []",
                resource_type: "index_or_alias",
                resource_id: "",
                index_uuid: "_na_",
                index: ""
            },
            status: 404
        };
        status = 404;
    }

    res.status(status).json(resData);

    await publishEvent({
        port: 9200,
        req: req,
        resData: { status, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resData) }
    });
};
