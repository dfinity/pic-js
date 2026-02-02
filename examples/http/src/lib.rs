use ic_asset_certification::{Asset, AssetConfig, AssetRouter};
use ic_cdk::{
    api::{certified_data_set, data_certificate},
    *,
};
use ic_http_certification::{HttpRequest, HttpResponse};
use std::cell::RefCell;

thread_local! {
    static ASSET_ROUTER: RefCell<AssetRouter<'static>> = Default::default();
}

const INDEX_HTML: &[u8] = include_bytes!("index.html");

#[init]
fn init() {
    let assets = vec![Asset::new("index.html", INDEX_HTML)];
    let asset_configs = vec![AssetConfig::File {
        path: "index.html".to_string(),
        content_type: Some("text/html".to_string()),
        headers: vec![],
        fallback_for: vec![],
        aliased_by: vec![],
        encodings: vec![],
    }];

    ASSET_ROUTER.with_borrow_mut(|asset_router| {
        if let Err(err) = asset_router.certify_assets(assets, asset_configs) {
            ic_cdk::trap(&format!("Failed to certify assets: {}", err));
        }

        certified_data_set(&asset_router.root_hash());
    });
}

#[post_upgrade]
fn post_upgrade() {
    init();
}

#[query]
fn http_request(req: HttpRequest) -> HttpResponse {
    ASSET_ROUTER.with_borrow(|asset_router| {
        if let Ok(response) = asset_router.serve_asset(
            &data_certificate().expect("No data certificate available"),
            &req,
        ) {
            response
        } else {
            ic_cdk::trap("Failed to serve asset");
        }
    })
}
