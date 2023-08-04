/**
 * Galex - A tool for galex campaign action
 * 
 * Author @3lang3 2023-06-21
 * Github: https://github.com/3lang3
 */
import fs from 'fs/promises';
import { ethers } from "ethers";
import { cli } from "./utils/cli";
import { Galex } from "./module";
import cfg from "./config";
import { loop } from "./utils/utils";

// 领取任务积分
const claim = async (wallet: ethers.Wallet) => {
  await loop(async () => {
    const account = new Galex({ privateKey: wallet.privateKey });
    const r = await account.getPrepareParticipate({
      campaignID: cfg.campaignId,
      chain: 'ETHEREUM',
    });
    if (r.prepareParticipate?.disallowReason) {
      console.log(`领取失败: ${r.prepareParticipate?.disallowReason}`);
      return;
    }
    if (r.prepareParticipate?.loyaltyPointsTxResp?.TotalClaimedPoints) {
      console.log(`领取成功: ${r.prepareParticipate?.loyaltyPointsTxResp?.TotalClaimedPoints} 分`);
    }
  })
};

// 获取widget containerId
function containerId() {
  return "persona-widget-" + new Array(16).fill(void 0).map((function () {
    return Math.floor(35 * Math.random()).toString(35)
  }
  )).join("")
}

// 获取widget url
const getPassportUrl = async (wallet: ethers.Wallet) => {
  let data = '';
  await loop(async () => {
    const account = new Galex({ privateKey: wallet.privateKey });
    const signature = await wallet.signMessage(`get_or_create_address_inquiry:${wallet.address.toLocaleLowerCase()}`)
    const { getOrCreateInquiryByAddress } = await account.getOrCreateInquiryByAddress({ signature });
    if (getOrCreateInquiryByAddress.status === 'Approved') {
      data = 'Approved';
      return;
    }
    const { sessionToken, inquiryID } = getOrCreateInquiryByAddress.personaInquiry
    if (!sessionToken) throw Error('sessionToken is null, retry')
    data = `https://withpersona.com/widget?client-version=4.7.1&container-id=${containerId()}&flow-type=embedded&environment=production&iframe-origin=https%3A%2F%2Fgalxe.com&inquiry-id=${inquiryID}&session-token=${sessionToken}`
  })
  // 将url存入 urls.txt 文件
  await fs.appendFile('urls.txt', `[${wallet.address}] ${data}\n`);
}

cli(async ({ action, pks, startIdx, endIdx }) => {
  for (let k = startIdx; k <= endIdx; k++) {
    const pk = pks[k];
    const wallet = new ethers.Wallet(pk);
    try {
      if (action === 'claim') {
        if (!cfg.campaignId || !cfg.w) {
          console.error(
            "❌ 请在config.ts中配置对应参数",
          );
          process.exit(1);
        }
        console.log(`[${action}] ${wallet.address} 开始执行claim`)
        await claim(wallet);
        console.log(`[${action}] ${wallet.address} claim执行完毕`)
      }

      if (action === 'passport') {
        console.log(`[${action}] ${wallet.address} 开始获取passport url`)
        await getPassportUrl(wallet);
        console.log(`[${action}] ${wallet.address} passport url获取完毕`)
      }

    } catch (error) {
      console.log(error?.reason || error?.message)
    }
  }
});
