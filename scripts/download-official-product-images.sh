#!/usr/bin/env bash
set -euo pipefail

catalog_html="${1:-/tmp/beyblade-lineup.html}"
destination="${2:-public/assets/products}"
base_url="https://beyblade.takaratomy.co.jp/beyblade-x/lineup"

if [[ ! -f "$catalog_html" ]]; then
  echo "Missing catalog HTML: $catalog_html" >&2
  exit 1
fi

mkdir -p "$destination"
manifest="$(mktemp /tmp/beyscore-product-images.XXXXXX)"
trap 'rm -f "$manifest"' EXIT

sed -nE 's/.*src="(_image\/[^\"]+_list\.(png|webp))".*/\1/p' "$catalog_html" \
  | sort -u > "$manifest"

download_one() {
  local relative="$1"
  local target_dir="$2"
  local filename="${relative##*/}"
  if [[ -s "$target_dir/$filename" ]]; then
    return 0
  fi
  curl -L --fail --silent --show-error --retry 3 \
    "$base_url/$relative" -o "$target_dir/$filename"
}

export -f download_one
export base_url
xargs -P "${DOWNLOAD_JOBS:-2}" -I '{}' bash -c 'download_one "$1" "$2"' _ '{}' "$destination" < "$manifest"

echo "Downloaded $(wc -l < "$manifest" | tr -d ' ') official product images to $destination"
