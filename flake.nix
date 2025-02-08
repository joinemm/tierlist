{
  description = "tierlist";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      treefmt-nix,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        treefmtEval = treefmt-nix.lib.evalModule pkgs (_: {
          projectRootFile = "flake.nix";
          programs.prettier.enable = true;
        });
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            bun
          ];
        };

        formatter = treefmtEval.config.build.wrapper;
      }
    );
}
