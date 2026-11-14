const DONKEY_13 = Object.freeze({
  title: 'DONKEY 13',
  source: 'https://sketchfab.com/3d-models/donkey-13-77bcefe8d32b40cba8e706f43e3e0996',
  author: 'amoreno',
  authorUrl: 'https://sketchfab.com/amoreno',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
});

// A replacement asset must identify its actual source. The earlier authored
// mule must never inherit the attribution of an unrelated downloaded model.
export function assetCredit(asset) {
  if (asset?.attribution?.id !== 'donkey-13') return null;
  return {...DONKEY_13, changes: String(asset.attribution.changes || 'Adaptación para SIERRA.')};
}

export function appendAssetCredit(container, asset) {
  const credit = assetCredit(asset);
  if (!credit) return;
  const node = document.createElement('small');
  node.className = 'archive-asset-credit';
  const link = (label, href) => {
    const anchor = document.createElement('a');
    anchor.textContent = label; anchor.href = href;
    anchor.target = '_blank'; anchor.rel = 'noopener noreferrer';
    return anchor;
  };
  node.append(link(credit.title, credit.source), ' — ', link(credit.author, credit.authorUrl),
    ' · ', link(credit.license, credit.licenseUrl), `. ${credit.changes}`);
  container.appendChild(node);
}
