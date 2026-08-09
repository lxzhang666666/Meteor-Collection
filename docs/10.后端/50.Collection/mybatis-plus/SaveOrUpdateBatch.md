# mybatis-plus

## saveOrUpdateBatch

重写saveOrUpdateBatch

```java
@Override
  @Transactional(
      rollbackFor = {Exception.class}
  )
  public boolean saveOrUpdateBatch(Collection<TCustomerMY> entityList) {
    //
    return SqlHelper.saveOrUpdateBatch(this.entityClass, this.mapperClass, this.log, entityList, 1000,
        (sqlSession, entity) -> {
          MapperMethod.ParamMap param = new MapperMethod.ParamMap();

          Object date = ReflectionKit.getFieldValue(entity, "naturalYearMonth");
          Object type = ReflectionKit.getFieldValue(entity, "dateType");
          Object fqGuid = ReflectionKit.getFieldValue(entity, "fqGuid");
          LambdaQueryWrapper<TCustomerMY> queryWrapper = new LambdaQueryWrapper<>();
          queryWrapper.eq(TCustomerMY::getDateType, type).eq(TCustomerMY::getNaturalYearMonth, date)
              .eq(TCustomerMY::getFqGuid, fqGuid);
          // 自定义查询条件
          param.put("ew", queryWrapper);

          // 判断记录是否存在，存在则更新，否则插入
          return (StringUtils.checkValNull(fqGuid) || StringUtils.checkValNull(type)|| StringUtils.checkValNull(fqGuid)) || CollectionUtils.isEmpty(
              sqlSession.selectList(this.getSqlStatement(
                  SqlMethod.SELECT_LIST), param));
        }, (sqlSession, entity) -> {
          MapperMethod.ParamMap param = new MapperMethod.ParamMap();
          // 需要更新的当前记录实体
          param.put("et", entity);

          Object date = ReflectionKit.getFieldValue(entity, "naturalYearMonth");
          Object type = ReflectionKit.getFieldValue(entity, "dateType");
          Object fqGuid = ReflectionKit.getFieldValue(entity, "fqGuid");
          LambdaQueryWrapper<TCustomerMY> queryWrapper = new LambdaQueryWrapper<>();
          queryWrapper.eq(TCustomerMY::getDateType, type).eq(TCustomerMY::getNaturalYearMonth, date)
              .eq(TCustomerMY::getFqGuid, fqGuid);
          // 自定义查询条件
          param.put("ew", queryWrapper);

          sqlSession.update(this.getSqlStatement(SqlMethod.UPDATE), param);
        });
  }
```

方式二

```java
updateBatchByQueryWrapper(updateList, calculate -> new QueryWrapper<>().eq("xxx", calculate.getKeyGuid()));


private boolean updateBatchByQueryWrapper(Collection<TPriceAmountCalculate> entityList, Function<TPriceAmountCalculate, QueryWrapper> queryWrapperFunction) {
        String sqlStatement = this.getSqlStatement(SqlMethod.UPDATE);
        return this.executeBatch(entityList, DEFAULT_BATCH_SIZE, (sqlSession, entity) -> {
            MapperMethod.ParamMap param = new MapperMethod.ParamMap();
            param.put(Constants.ENTITY, entity);
            param.put(Constants.WRAPPER, queryWrapperFunction.apply(entity));
            sqlSession.update(sqlStatement, param);
        });
}
```

