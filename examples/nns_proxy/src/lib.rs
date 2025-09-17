use candid::CandidType;
use ic_cdk::*;

#[allow(dead_code, unused_imports)]
mod governance {
    include!(concat!(env!("OUT_DIR"), "/governance.rs"));
}

#[derive(CandidType)]
struct NeuronId {
    id: u64,
}

#[derive(CandidType)]
struct ProposalInfo {
    id: Option<NeuronId>,
    status: i32,
    title: Option<String>,
    summary: Option<String>,
}

#[update]
async fn get_pending_proposals() -> Vec<ProposalInfo> {
    let proposals = governance::list_proposals(&governance::ListProposalInfo {
        before_proposal: None,
        exclude_topic: vec![],
        include_reward_status: vec![0, 1, 2, 3, 4, 5],
        include_status: vec![1],
        include_all_manage_neuron_proposals: None,
        omit_large_fields: None,
        limit: 100,
    })
    .await
    .unwrap();

    proposals
        .proposal_info
        .into_iter()
        .map(|proposal| ProposalInfo {
            id: proposal.id.map(|neuron_id| NeuronId { id: neuron_id.id }),
            status: proposal.status,
            title: proposal.proposal.as_ref().and_then(|s| s.title.clone()),
            summary: proposal.proposal.as_ref().map(|s| s.summary.clone()),
        })
        .collect()
}
