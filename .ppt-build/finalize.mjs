import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {PresentationFile} from '@oai/artifact-tool';
process.env.RUNTIME_NODE_MODULES='C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
process.env.RUNTIME_NODE='C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe';
const SKILL_DIR='C:/Users/Admin/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations';
const workspaceDir='E:/OtherProjects/Temp';
const candidatePath=path.join(workspaceDir,'.ppt-build','candidate.pptx');
const FINAL_PPTX=path.join(workspaceDir,'交付','东盟自然资源分布推理系统_广西大学汇报.pptx');
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL_DIR,'container_tools/artifact_tool_utils.mjs')).href);
const stagingDir=path.join(workspaceDir,'.ppt-build','.codex-finalizer');
await fs.mkdir(stagingDir,{recursive:true});
const result=await finalizePresentation({
 workspaceDir,candidatePath,finalPath:FINAL_PPTX,
 pythonExecutable:'C:/Users/Admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit'],
 requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],explicitTotalSlideCount:16,
 fontPolicy:{basis:'design',families:['Aptos'],scriptFonts:{ea:'Microsoft YaHei'}},verifyArtifactToolImport:true,
 receiptPath:path.join(stagingDir,'validation.json')
});
console.log(JSON.stringify(result));




