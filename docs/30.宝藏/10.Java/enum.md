---
title: enum
date: 2026-08-09 14:56:23
permalink: /pages/913977/
categories:
  - 后端
  - Collection
  - java
tags:
  - 
author: 
  name: Meteor
  link: https://github.com/lxzhang666666
---
# Enum 使用

> 使用枚举完成 多种消息参数可变发送


```java
@FunctionalInterface
public interface WeChatMsgFunction {

  static final String VALUE = "value";

  void send(String toUser, String page, WeChatMsgBase data);

}
```

```java
@Data
public class WeChatMsgBase {

}
```

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class AuditResultsWeChatMsg extends WeChatMsgBase {

  @ApiModelProperty(name = "审核项目",example = "香月楠岸C栋1单元1802")
  private String thing3;

  @ApiModelProperty(name = "审批时间",example = "2019-05-09 13:00:00")
  private String time10;

  @ApiModelProperty(name = "审核结果",example = "审核失败")
  private String phrase1;

  @ApiModelProperty(name = "备注",example = "备注")
  private String thing4;

}
```

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class OrderStatusWeChatMsg extends WeChatMsgBase {

  @ApiModelProperty(name = "订单状态",example = "已接单")
  private String phrase1;

  @ApiModelProperty(name = "订单内容",example = "会议室预定")
  private String thing7;

  @ApiModelProperty(name = "温馨提示",example = "你的订单还有15分钟开始")
  private String thing4;

}
```

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class OrderToBePaidWeChatMsg extends WeChatMsgBase {

  @ApiModelProperty(name = "订单状态",example = "已接单")
  private String phrase2;

  @ApiModelProperty(name = "订单时间",example = "2020-09-19")
  private String time4;

  @ApiModelProperty(name = "温馨提示",example = "请尽快支付订单")
  private String thing5;

}
```

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class PayRentWeChatMsg extends WeChatMsgBase {

  @ApiModelProperty(name = "备注",example = "备注")
  private String thing3;

  @ApiModelProperty(name = "应缴日期",example = "2019年11月11日")
  private String date4;

}
```

```java
@Slf4j
@Getter
@NoArgsConstructor
@AllArgsConstructor
public enum WeChatMsgEnum implements WeChatMsgFunction {


  AUDIT_RESULTS_MSG("AUDIT_RESULTS_MSG","审核结果通知",WechatService.AUDIT_RESULTS_MSG_TEMPLATE_ID){
    public void send(String toUser, String page, WeChatMsgBase data){
      log.info("WeChatMsgEnum#send name {} templateId {}",this.name,WechatService.AUDIT_RESULTS_MSG_TEMPLATE_ID);
      sendMsg(toUser,page,WechatService.AUDIT_RESULTS_MSG_TEMPLATE_ID,data);
    }
  },

  ORDER_TO_BE_PAID_MSG("ORDER_TO_BE_PAID_MSG","订单待支付通知",WechatService.ORDER_TO_BE_PAID_MSG_TEMPLATE_ID){
    public void send(String toUser, String page, WeChatMsgBase data){
      log.info("WeChatMsgEnum#send name {} templateId {}",this.name,WechatService.ORDER_TO_BE_PAID_MSG_TEMPLATE_ID);
      sendMsg(toUser,page,WechatService.ORDER_TO_BE_PAID_MSG_TEMPLATE_ID,data);
    }
  },

  ORDER_STATUS_MSG("ORDER_STATUS_MSG","订单状态通知",WechatService.ORDER_STATUS_MSG_TEMPLATE_ID){
    public void send(String toUser, String page, WeChatMsgBase data){
      log.info("WeChatMsgEnum#send name {} templateId {}",this.name,WechatService.ORDER_STATUS_MSG_TEMPLATE_ID);
      sendMsg(toUser,page,WechatService.ORDER_STATUS_MSG_TEMPLATE_ID,data);
    }
  },

  PAY_RENT_MSG("PAY_RENT_MSG","支付租金通知",WechatService.PAY_RENT_MSG_TEMPLATE_ID){
    public void send(String toUser, String page, WeChatMsgBase data){
      log.info("WeChatMsgEnum#send name {} templateId {}",this.name,WechatService.PAY_RENT_MSG_TEMPLATE_ID);
      sendMsg(toUser,page,WechatService.PAY_RENT_MSG_TEMPLATE_ID,data);
    }
  }

  ;

  String code;

  String name;
  String templateId;


  private static void sendMsg(String toUser, String page,String templateId, WeChatMsgBase data){
    log.info("WeChatMsgEnum#sendMsg toUser {} page {} templateId {}",toUser,page,templateId);
    Class<? extends WeChatMsgBase> aClass = data.getClass();
    Field[] declaredFields = aClass.getDeclaredFields();
    Map<String, Map<String,Object>> paramMap = new HashMap<>();
    Stream.of(declaredFields).forEach(field -> {
      String fieldName = field.getName();
      //设置对象的访问权限，保证对private的属性的访问
      field.setAccessible(true);
      Map<String, Object> valueMap = new HashMap<>();
      try {
        Object paramData = field.get(data);
        valueMap.put(VALUE,paramData);
      } catch (IllegalAccessException e) {
        log.error("WeChatMsgEnum#sendMsg 组装参数异常",e);
      }
      paramMap.put(fieldName,valueMap);
    });
    WechatService.sendMessage(toUser, templateId, page,paramMap);

  }

}
```

> 使用枚举实现 多种规则-同种入参、出参逻辑 抓取数据入库

```java
@FunctionalInterface
public interface StatisticsGeneralFunction<T,V,A,X> {

  T doWork(V v,A a,X x);
}
```

```java
@FunctionalInterface
public interface StatisticsGeneralDateRangeFunction<T,V,A,X,D,E> {

  T doWork(V v,A a,X x,D d,E e);
}
```

```java
@Slf4j
@Component
@Lazy
public class StatisticsGeneralFunctionManager {

  static ConcurrentHashMap<String, IpOrg> storeMappingMap = (ConcurrentHashMap<String, IpOrg>) ApplicationContextHelper
      .getBean("storeMappingMap");

  static ConcurrentHashMap<String, DataSource> sqlServerConfigMap = (ConcurrentHashMap<String, DataSource>) ApplicationContextHelper
      .getBean("sqlServerConfigMap");


  static {
    if (Objects.isNull(storeMappingMap)) {
      throw new RuntimeException("storeMappingMap初始化失败  启动失败");
    }
    log.warn("storeMappingMap {}", storeMappingMap);

    if (Objects.isNull(sqlServerConfigMap)) {
      throw new RuntimeException("sqlServerConfigMap初始化失败  启动失败");
    }
    log.warn("sqlServerConfigMap {}", sqlServerConfigMap);
  }

  private static final String PATTERN_STR = "&param&";

  private static final Pattern pattern = Pattern.compile(PATTERN_STR);

  /**
   * 客单价
   */
  public static List<IpStatisticsGeneral> buildUnitSalesVolume(
      List<IpStatisticsGeneral> coinNum, String storeCode, String date) {
    List<IpStatisticsGeneral> result = new ArrayList<>();
    return result;
  }

  public static String buildStoreName(String storeCode) {
    return storeMappingMap.get(storeCode).getStoreName();
  }
}
```

```java
@Slf4j
@Lazy
@Component
public class StatisticsGeneralDateRangeFunctionManager {


  static ConcurrentHashMap<String, IpOrg> storeMappingMap = (ConcurrentHashMap<String, IpOrg>) ApplicationContextHelper
      .getBean("storeMappingMap");

  static ConcurrentHashMap<String, DataSource> sqlServerConfigMap = (ConcurrentHashMap<String, DataSource>) ApplicationContextHelper
      .getBean("sqlServerConfigMap");


  static {
    if (Objects.isNull(storeMappingMap)) {
      throw new RuntimeException("storeMappingMap初始化失败  启动失败");
    }
    log.warn("storeMappingMap range {}", storeMappingMap);

    if (Objects.isNull(sqlServerConfigMap)) {
      throw new RuntimeException("sqlServerConfigMap初始化失败  启动失败");
    }
    log.warn("sqlServerConfigMap range {}", sqlServerConfigMap);

  }

  private static final String PATTERN_STR = "&param&";

  private static final Pattern pattern = Pattern.compile(PATTERN_STR);

  /**
   * 客单价
   */
  public static List<IpStatisticsGeneral> buildUnitSalesVolume(
      List<IpStatisticsGeneral> coinNum, String storeCode, String date, String beginDate,
      Type type) {
    List<IpStatisticsGeneral> result = new ArrayList<>();
    return result;
  }

  public static String buildStoreName(String storeCode) {
    return storeMappingMap.get(storeCode).getStoreName();
  }
}
```

```java
@Getter
public enum FunctionIndexEnum {

  /**
   * 客单价
   */
  UNIT_SALES_VOLUME("unit_sales_volume", "客单价", "INCOME", "收入", "project",
      Arrays.asList("amount_num", "unit_sales_volume_num"),
      StatisticsGeneralFunctionManager::buildUnitSalesVolume,
      StatisticsGeneralDateRangeFunctionManager::buildUnitSalesVolume),

  /**
   * 核心客单价
   */
  PER_TICKET_SALES("per_ticket_sales","核心客单价","INCOME","收入","project",
      Arrays.asList("per_ticket_sales_amount", "per_ticket_sales_num"),
      StatisticsGeneralFunctionManager::buildPerTicketSales,
      StatisticsGeneralDateRangeFunctionManager::buildPerTicketSales),

  /**
   * 代币核心客单价
   */
  TOKEN_PER_TICKET_SALES("token_per_ticket_sales","代币核心客单价","INCOME","收入","project",
      Arrays.asList("token_per_ticket_sales_amount", "token_per_ticket_sales_num"),
      StatisticsGeneralFunctionManager::buildTokenPerTicketSales,
      StatisticsGeneralDateRangeFunctionManager::buildTokenPerTicketSales),

  /**
   * 门票客单价
   */
  GATE_PER_TICKET_SALES("gate_per_ticket_sales","门票客单价","INCOME","收入","project",
      Arrays.asList("gate_per_ticket_sales_amount", "gate_per_ticket_sales_num"),
      StatisticsGeneralFunctionManager::buildGatePerTicketSales,
      StatisticsGeneralDateRangeFunctionManager::buildGatePerTicketSales),


  /**
   * 乐园门票客单价
   */
  PARADISE_GATE_PER_TICKET_SALES_SALES("paradise_gate_per_ticket_sales","乐园门票客单价","INCOME","收入","project",
      Arrays.asList("paradise_gate_per_ticket_sales_amount", "paradise_gate_per_ticket_sales_num"),
      StatisticsGeneralFunctionManager::buildParadiseGatePerTicketSales,
      StatisticsGeneralDateRangeFunctionManager::buildParadiseGatePerTicketSales),

  /**
   * 代币消耗量
   */
  COIN_NUM("coin_num", "门票类数据", "ADMISSION_TICKET", "门票", "project",
      Arrays.asList("mach_tokens", "ticket_tokens"),
      StatisticsGeneralFunctionManager::buildCoinNum,
      StatisticsGeneralDateRangeFunctionManager::buildCoinNum),

  /**
   * 门票类数据
   */
  CYCLE_TICKET_PROPORTION("cycle_ticket_proportion", "门票类数据", "ADMISSION_TICKET", "门票", "project",
      Arrays.asList("cycle_ticket_store", "cycle_ticket_wipe", "time_ticket_wipe",
          "cycle_ticket_open", "cycle_ticket_over", "time_ticket_sales", "time_ticket_over"),
      StatisticsGeneralFunctionManager::buildCycleTicketProportion,
      StatisticsGeneralDateRangeFunctionManager::buildCycleTicketProportion),

  /**
   * 代币类数据
   */
  TOKENS_PROPORTION("tokens_proportion", "代币类数据", "COIN", "代币", "project",
      Arrays.asList("token_sales_dig", "token_sales_sub", "token_sales", "enter_tokens_sub",
          "out_tokens", "mach_tokens_dig", "coin_num"),
      StatisticsGeneralFunctionManager::buildTokensProportion,StatisticsGeneralDateRangeFunctionManager::buildTokensProportion),

  /**
   * // 预充值率
   */
  PRELOADED_RATE("preloaded_rate", "预充值率", "INCOME", "收入", "project",
      Arrays.asList("main_sales_amount_more_than_200", "main_sales_amount"),
      StatisticsGeneralFunctionManager::buildPreloadedRateDetail,StatisticsGeneralDateRangeFunctionManager::buildPreloadedRateDetail),

  /**
   * 彩票类数据
   */
  LOTTERY_DETAIL("lottery_detail", "彩票类数据", "LOTTERY_DATA", "彩票", "project",
      Arrays.asList("lottery_print_dig", "lottery_store_paper", "lottery_store_dig",
          "lottery_print_paper", "lottery_cush_paper", "lottery_cush_dig"),
      StatisticsGeneralFunctionManager::buildLotteryDetail,StatisticsGeneralDateRangeFunctionManager::buildLotteryDetail),

  /**
   * 销售金额 人员排名
   */
  SALES_RANKING("sales_ranking_ds_", "销售金额_人员排名", "INCOME", "收入", "project", null,
      StatisticsGeneralFunctionManager::buildSalesRankingDetail,StatisticsGeneralDateRangeFunctionManager::buildSalesRankingDetail),

  /**
   * 销售金额 商品分类
   */
  GOODS_SALES_DETAIL("goods_sales_detail", "销售金额_商品", "INCOME", "收入", "project", null,
      StatisticsGeneralFunctionManager::buildGoodsSaleDetail,StatisticsGeneralDateRangeFunctionManager::buildGoodsSaleDetail),

  /**
   * 销售金额 杂项
   */
  SUNDRY_NUM_DETAIL("sundry_num_detail", "杂项", "INCOME", "收入", "project", null,
      StatisticsGeneralFunctionManager::buildSundryNumDetail,StatisticsGeneralDateRangeFunctionManager::buildSundryNumDetail),

  /**
   * 销售金额 渠道
   */
  TERMINAL_DETAIL("terminal_detail", "销售金额_渠道", "INCOME", "收入", "project", null,
      StatisticsGeneralFunctionManager::buildTerminalDetail,StatisticsGeneralDateRangeFunctionManager::buildTerminalDetail),

  /**
   * 会员等级
   */
  MEMBER_LEVEL_DETAIL("member_level_detail", "会员等级", "MEMBER_DATA", "会员", "project", null,
      StatisticsGeneralFunctionManager::buildMemberLevelDetail,StatisticsGeneralDateRangeFunctionManager::buildMemberLevelDetail),

  /**
   * 代币详
   */
  MACH_TOKENS_DETAIL("mach_tokens_detail", "代币详", "COIN", "代币", "project", null,
      StatisticsGeneralFunctionManager::buildMachTokensDetail,StatisticsGeneralDateRangeFunctionManager::buildMachTokensDetail),

  /**
   * 彩票详
   */
  LOTTERY_DETAILS("lottery_details", "彩票详", "LOTTERY_DATA", "彩票", "project", null,
      StatisticsGeneralFunctionManager::buildLotteryDetails,StatisticsGeneralDateRangeFunctionManager::buildLotteryDetails),
  ;

  private final String indexCode;

  private final String indexName;

  private final String dataCategory;

  private final String dataCategoryName;

  private final String dataLevel;

  private final List<String> indexCodes;

  private final StatisticsGeneralFunction<List<IpStatisticsGeneral>, List<IpStatisticsGeneral>, String, String> function;

  private final StatisticsGeneralDateRangeFunction<List<IpStatisticsGeneral>, List<IpStatisticsGeneral>, String, String, String,Type> dateRangeFunction;


  FunctionIndexEnum(String indexCode, String indexName, String dataCategory,
      String dataCategoryName,
      String dataLevel, List<String> indexCodes,
      StatisticsGeneralFunction<List<IpStatisticsGeneral>, List<IpStatisticsGeneral>, String, String> function,
      StatisticsGeneralDateRangeFunction<List<IpStatisticsGeneral>, List<IpStatisticsGeneral>, String, String, String,Type> dateRangeFunction) {
    this.indexCode = indexCode;
    this.indexName = indexName;
    this.dataCategory = dataCategory;
    this.dataCategoryName = dataCategoryName;
    this.dataLevel = dataLevel;
    this.indexCodes = indexCodes;
    this.function = function;
    this.dateRangeFunction = dateRangeFunction;
  }


}
```

```java
//处理 函数模式数据
for (FunctionIndexEnum value : funIndexEnums) {
  try {
    List<IpStatisticsGeneral> generals = new ArrayList<>();
    if (CollectionUtils.isNotEmpty(value.getIndexCodes())) {
      generals = generalArrayList.stream().filter(
          g -> value.getIndexCodes().contains(g.getIndexCode())).collect(Collectors.toList());
    }
    log.info("组装看板指标入库 storeCode {}  date {} functionEnum:{} ,indexs:{} ", storeCode, date,
        value.name(),
        value.getIndexCodes());
    List<IpStatisticsGeneral> generalList = value.getFunction()
        .doWork(generals, storeCode, date);
    generalArrayList.addAll(generalList);
  } catch (Exception e) {
    log.error("组装函数处理模式  看板指标入库异常 storeCode {}",storeCode, e);
    e.printStackTrace();
  }
}


//处理 函数模式数据
for (FunctionIndexEnum value : funIndexEnums) {
  try {
    List<IpStatisticsGeneral> yearGenerals = new ArrayList<>();
    if (CollectionUtils.isNotEmpty(value.getIndexCodes())) {
      yearGenerals = generalArrayList.stream().filter(
      // 此处 截取掉 index 中的 year_
      g -> value.getIndexCodes().contains(g.getIndexCode().substring(5)))
        .collect(Collectors.toList());
    }
    log.info("组装年维度看板指标入库 storeCode {}  date {} functionEnum:{} ,indexs:{} ", storeCode, date,
    value.name(),
    value.getIndexCodes());
    List<IpStatisticsGeneral> yearGeneralList = value.getDateRangeFunction()
      .doWork(yearGenerals, storeCode, yearEnd, yearBegin, Type.YEAR);
    generalArrayList.addAll(yearGeneralList);
  } catch (Exception e) {
    log.error("组装函数处理模式  看板指标入库异常 ", e);
    e.printStackTrace();
  }
}
```