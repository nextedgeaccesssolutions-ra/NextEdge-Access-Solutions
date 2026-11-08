# Codespaces prebuild recovery

The failed run `42195310848` attempted to create a prebuild from the deleted
branch `dependabot/npm_and_yarn/npm_and_yarn-e5820a6173` and commit
`7c46079fbac89ac82cfd8cd926f1ea652e5a65f0`. The checkout failure (1307)
therefore does not establish that the current default branch is unbuildable.

## Recovery

1. Use the current default branch, `main`, as the prebuild source.
2. Refresh or recreate the Codespaces prebuild configuration against the
   current `main` head. Do not retry the retired Dependabot ref.
3. Verify the source SHA is the current `main` commit before invoking the
   prebuild create operation.
4. Treat a 1307 checkout error as a source-ref problem until the checkout
   log proves otherwise. Do not create a replacement branch solely to make
   the historical run pass.

The archived run is historical evidence and should remain failed; new runs
should be started from the current branch and commit.
